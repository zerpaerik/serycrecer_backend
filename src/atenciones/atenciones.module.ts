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
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
/** Fecha local (Lima) en formato YYYY-MM-DD. */
const hoy = () => new Date().toLocaleDateString('en-CA');

class ItemDto {
  @IsString() tipo: string; // Servicio | Paquete
  @IsString() nombre: string;
  @Type(() => Number) @IsNumber() @Min(0) monto: number;
  @IsOptional() @Type(() => Number) @IsInt() servicioId?: number;
  @IsOptional() @Type(() => Number) @IsInt() paqueteId?: number;
}
class PagoInputDto {
  @Type(() => Number) @IsNumber() @Min(0) monto: number;
  @IsString() metodo: string;
}
class CreateAtencionDto {
  @Type(() => Number) @IsInt() pacienteId: number;
  @Type(() => Number) @IsInt() psicologoId: number;
  @IsOptional() @Type(() => Number) @IsInt() citaId?: number;
  @IsOptional() @IsString() fecha?: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items: ItemDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PagoInputDto) pagos?: PagoInputDto[];
}
class UpdateAtencionDto extends PartialType(CreateAtencionDto) {}
class PagoDto extends PagoInputDto {}
class AnularDto {
  @IsString() motivo: string;
}

const INCLUDE = {
  items: true,
  pagos: { where: { anulado: false }, orderBy: { fecha: 'asc' as const } },
  paciente: true,
  psicologo: true,
};

@Injectable()
export class AtencionesService {
  constructor(private readonly prisma: PrismaService) {}

  private async recompute(tx: Prisma.TransactionClient, atencionId: number) {
    const atn = await tx.atencion.findUnique({
      where: { id: atencionId },
      include: { items: true, pagos: { where: { anulado: false } } },
    });
    if (!atn) return;
    const total = atn.items.reduce((s, i) => s.plus(i.monto), D(0));
    const pagado = atn.pagos.reduce((s, p) => s.plus(p.monto), D(0));
    const saldoRaw = total.minus(pagado);
    const saldo = saldoRaw.lt(0) ? D(0) : saldoRaw;
    const estado = saldo.lte(0) ? 'Pagado' : pagado.lte(0) ? 'Pendiente' : 'Parcial';
    await tx.atencion.update({ where: { id: atencionId }, data: { total, pagado, saldo, estado } });
  }

  findAll(desde?: string, hasta?: string, search?: string) {
    return this.prisma.atencion.findMany({
      where: {
        ...(desde || hasta
          ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
          : {}),
        ...(search
          ? {
              paciente: {
                OR: [
                  { nombres: { contains: search, mode: 'insensitive' } },
                  { apellidos: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      orderBy: { fecha: 'desc' },
      include: INCLUDE,
    });
  }

  async findOne(id: number) {
    const atn = await this.prisma.atencion.findUnique({ where: { id }, include: INCLUDE });
    if (!atn) throw new NotFoundException(`Atención #${id} no encontrada`);
    return atn;
  }

  async create(dto: CreateAtencionDto, userId?: number) {
    const fecha = dto.fecha ?? hoy();
    const fechaPago = hoy();
    const id = await this.prisma.$transaction(async (tx) => {
      const atn = await tx.atencion.create({
        data: {
          pacienteId: dto.pacienteId,
          psicologoId: dto.psicologoId,
          citaId: dto.citaId,
          fecha,
          hora: dto.hora,
          observaciones: dto.observaciones,
          usuarioId: userId,
          items: {
            create: dto.items.map((i) => ({
              tipo: i.tipo,
              nombre: i.nombre,
              monto: D(i.monto),
              servicioId: i.servicioId,
              paqueteId: i.paqueteId,
            })),
          },
        },
      });

      const pagos = (dto.pagos ?? []).filter((p) => Number(p.monto) > 0);
      if (pagos.length) {
        await tx.pago.createMany({
          data: pagos.map((p) => ({
            atencionId: atn.id,
            monto: D(p.monto),
            metodo: p.metodo,
            tipo: 'Abono inicial',
            fecha: fechaPago,
            usuarioId: userId,
          })),
        });
      }

      // Crea la bolsa de sesiones por cada ítem de tipo Paquete.
      for (const it of dto.items.filter((i) => i.tipo === 'Paquete' && i.paqueteId)) {
        const paq = await tx.paquete.findUnique({ where: { id: it.paqueteId! } });
        await tx.paquetePaciente.create({
          data: {
            pacienteId: dto.pacienteId,
            paqueteId: it.paqueteId!,
            nombre: it.nombre,
            totalSesiones: paq?.sesiones ?? 0,
            precio: D(it.monto),
            fecha: fechaPago,
            atencionId: atn.id,
          },
        });
      }

      if (dto.citaId) {
        await tx.cita.update({ where: { id: dto.citaId }, data: { estado: 'Atendida' } });
      }

      await this.recompute(tx, atn.id);
      return atn.id;
    });
    return this.findOne(id);
  }

  async addPago(id: number, dto: PagoDto, userId?: number) {
    const atn = await this.findOne(id);
    if (atn.anulada) throw new BadRequestException('La atención está anulada');
    const saldo = D(atn.saldo);
    const monto = D(dto.monto);
    if (monto.lte(0)) throw new BadRequestException('Monto inválido');
    if (monto.gt(saldo)) throw new BadRequestException('El abono supera el saldo');
    await this.prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: { atencionId: id, monto, metodo: dto.metodo, tipo: 'Cobro', fecha: hoy(), usuarioId: userId },
      });
      await this.recompute(tx, id);
    });
    return this.findOne(id);
  }

  async anular(id: number, motivo: string) {
    const atn = await this.findOne(id);
    if (atn.anulada) throw new BadRequestException('La atención ya está anulada');
    await this.prisma.$transaction(async (tx) => {
      await tx.pago.updateMany({ where: { atencionId: id }, data: { anulado: true } });
      await tx.atencion.update({
        where: { id },
        data: {
          anulada: true,
          anuladaAt: new Date(),
          motivoAnulacion: motivo,
          pagado: D(0),
          saldo: D(atn.total),
          estado: 'Pendiente',
        },
      });
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateAtencionDto) {
    await this.findOne(id);
    // Solo se editan cabecera/observaciones aquí (los cobros van por su ruta).
    return this.prisma.atencion.update({
      where: { id },
      data: { observaciones: dto.observaciones, hora: dto.hora },
      include: INCLUDE,
    });
  }
}

@Controller('atenciones')
export class AtencionesController {
  constructor(private readonly service: AtencionesService) {}

  @Get() findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(desde, hasta, search);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreateAtencionDto, @Req() req: Request) {
    return this.service.create(dto, (req as any).user?.sub);
  }
  @UseGuards(JwtAuthGuard) @Post(':id/pagos') addPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PagoDto,
    @Req() req: Request,
  ) {
    return this.service.addPago(id, dto, (req as any).user?.sub);
  }
  @UseGuards(JwtAuthGuard) @Post(':id/anular') anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularDto,
  ) {
    return this.service.anular(id, dto.motivo);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAtencionDto,
  ) {
    return this.service.update(id, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AtencionesController],
  providers: [AtencionesService],
})
export class AtencionesModule {}
