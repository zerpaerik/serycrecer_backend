import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

const N = (v: unknown) => Number(v ?? 0);
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const hoyIso = () => new Date().toLocaleDateString('en-CA');

class AbrirTurnoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montoInicial?: number;
  @IsOptional() @IsString() fecha?: string;
}
class CerrarTurnoDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montoContado?: number;
  @IsOptional() @IsString() observaciones?: string;
}

const USER_SEL = { select: { id: true, nombre: true } };

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Turno abierto actualmente (si existe). Solo puede haber uno a la vez. */
  turnoAbierto() {
    return this.prisma.cajaTurno.findFirst({
      where: { estado: 'Abierto' },
      include: { usuarioApertura: USER_SEL, usuarioCierre: USER_SEL },
      orderBy: { abiertoEn: 'desc' },
    });
  }

  /** Totales calculados de un turno (ingresos por método, gastos y neto). */
  private async totales(turnoId: number) {
    const [pagos, gastos] = await Promise.all([
      this.prisma.pago.findMany({
        where: { turnoId, anulado: false, atencion: { is: { anulada: false } } },
        include: { atencion: { include: { paciente: true } } },
      }),
      this.prisma.gasto.findMany({ where: { turnoId }, orderBy: { createdAt: 'asc' } }),
    ]);
    const total = pagos.reduce((s, p) => s + N(p.monto), 0);
    const porMetodo: Record<string, number> = {};
    for (const p of pagos) porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + N(p.monto);
    const totalGastos = gastos.reduce((s, g) => s + N(g.monto), 0);
    return {
      total,
      count: pagos.length,
      porMetodo,
      totalGastos,
      neto: total - totalGastos,
      // Efectivo esperado en caja al cerrar: inicial + cobros en efectivo − gastos en efectivo.
      efectivoCobrado: porMetodo['Efectivo'] ?? 0,
      efectivoGastado: gastos.filter((g) => g.metodo === 'Efectivo').reduce((s, g) => s + N(g.monto), 0),
      pagos: pagos.map((p) => ({
        id: p.id,
        monto: N(p.monto),
        metodo: p.metodo,
        tipo: p.tipo,
        paciente: p.atencion ? `${p.atencion.paciente.nombres} ${p.atencion.paciente.apellidos}` : '—',
      })),
      gastos: gastos.map((g) => ({
        id: g.id,
        monto: N(g.monto),
        categoria: g.categoria,
        metodo: g.metodo,
        descripcion: g.descripcion ?? '',
      })),
    };
  }

  private conEsperado(turno: any, t: Awaited<ReturnType<CajaService['totales']>>) {
    const esperadoEfectivo = N(turno.montoInicial) + t.efectivoCobrado - t.efectivoGastado;
    const contado = turno.montoContado == null ? null : N(turno.montoContado);
    return {
      ...turno,
      montoInicial: N(turno.montoInicial),
      montoContado: contado,
      ...t,
      esperadoEfectivo,
      diferencia: contado == null ? null : contado - esperadoEfectivo,
    };
  }

  async listarTurnos(fecha?: string) {
    const turnos = await this.prisma.cajaTurno.findMany({
      where: fecha ? { fecha } : undefined,
      include: { usuarioApertura: USER_SEL, usuarioCierre: USER_SEL },
      orderBy: [{ fecha: 'desc' }, { abiertoEn: 'desc' }],
      take: fecha ? undefined : 50,
    });
    return Promise.all(turnos.map(async (t) => this.conEsperado(t, await this.totales(t.id))));
  }

  async getTurno(id: number) {
    const turno = await this.prisma.cajaTurno.findUnique({
      where: { id },
      include: { usuarioApertura: USER_SEL, usuarioCierre: USER_SEL },
    });
    if (!turno) throw new NotFoundException(`Turno #${id} no encontrado`);
    return this.conEsperado(turno, await this.totales(id));
  }

  async abrir(dto: AbrirTurnoDto, userId?: number) {
    const abierto = await this.turnoAbierto();
    if (abierto) {
      throw new BadRequestException(
        `Ya hay un turno de caja abierto (${abierto.nombre}). Ciérralo antes de abrir otro.`,
      );
    }
    const fecha = dto.fecha ?? hoyIso();
    const nDelDia = await this.prisma.cajaTurno.count({ where: { fecha } });
    const turno = await this.prisma.cajaTurno.create({
      data: {
        fecha,
        nombre: dto.nombre?.trim() || `Turno ${nDelDia + 1}`,
        montoInicial: D(dto.montoInicial ?? 0),
        usuarioAperturaId: userId,
      },
      include: { usuarioApertura: USER_SEL, usuarioCierre: USER_SEL },
    });
    return this.conEsperado(turno, await this.totales(turno.id));
  }

  async cerrar(id: number, dto: CerrarTurnoDto, userId?: number) {
    const turno = await this.prisma.cajaTurno.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno #${id} no encontrado`);
    if (turno.estado === 'Cerrado') throw new BadRequestException('Este turno ya está cerrado');
    const cerrado = await this.prisma.cajaTurno.update({
      where: { id },
      data: {
        estado: 'Cerrado',
        cerradoEn: new Date(),
        montoContado: dto.montoContado == null ? null : D(dto.montoContado),
        observaciones: dto.observaciones,
        usuarioCierreId: userId,
      },
      include: { usuarioApertura: USER_SEL, usuarioCierre: USER_SEL },
    });
    return this.conEsperado(cerrado, await this.totales(id));
  }

  /** Turno abierto con sus totales (o null si la caja está cerrada). */
  async actual() {
    const turno = await this.turnoAbierto();
    if (!turno) return null;
    return this.conEsperado(turno, await this.totales(turno.id));
  }
}

@UseGuards(JwtAuthGuard)
@Controller('caja/turnos')
export class CajaController {
  constructor(private readonly service: CajaService) {}

  @Get() listar(@Query('fecha') fecha?: string) {
    return this.service.listarTurnos(fecha);
  }
  @Get('actual') actual() {
    return this.service.actual();
  }
  @Get(':id') detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.getTurno(id);
  }
  @Post('abrir') abrir(@Body() dto: AbrirTurnoDto, @Req() req: Request) {
    return this.service.abrir(dto, (req as any).user?.sub);
  }
  @Post(':id/cerrar') cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarTurnoDto,
    @Req() req: Request,
  ) {
    return this.service.cerrar(id, dto, (req as any).user?.sub);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
