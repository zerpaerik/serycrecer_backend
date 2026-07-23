import {
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

const N = (v: unknown) => Number(v ?? 0);
const hoyIso = () => new Date().toLocaleDateString('en-CA');

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async reportes(desde: string, hasta: string) {
    const [pagos, atns, citas, psicologos] = await Promise.all([
      this.prisma.pago.findMany({
        where: { anulado: false, fecha: { gte: desde, lte: hasta }, atencion: { is: { anulada: false } } },
        include: { atencion: { select: { psicologoId: true } } },
      }),
      this.prisma.atencion.findMany({
        where: { anulada: false, fecha: { gte: desde, lte: hasta } },
        include: { items: true },
      }),
      this.prisma.cita.findMany({ where: { fecha: { gte: desde, lte: hasta }, estado: { not: 'Cancelada' } } }),
      this.prisma.psicologo.findMany(),
    ]);

    const ingresos = pagos.reduce((s, p) => s + N(p.monto), 0);
    const atendidas = citas.filter((c) => c.estado === 'Atendida').length;
    const faltas = citas.filter((c) => c.estado === 'No asistió').length;
    const tasaAsistencia = atendidas + faltas ? (atendidas / (atendidas + faltas)) * 100 : 0;
    const pacientes = new Set(atns.map((a) => a.pacienteId)).size;

    const serieMap = new Map<string, number>();
    for (const p of pagos) serieMap.set(p.fecha, (serieMap.get(p.fecha) ?? 0) + N(p.monto));
    const serieIngresos = [...serieMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([fecha, value]) => ({ fecha, value }));

    const psiMap = new Map<number, number>();
    for (const p of pagos) {
      const k = p.atencion?.psicologoId;
      if (k) psiMap.set(k, (psiMap.get(k) ?? 0) + N(p.monto));
    }
    const porPsicologo = psicologos
      .map((ps) => ({ id: ps.id, nombre: ps.nombre, color: ps.color, ingreso: psiMap.get(ps.id) ?? 0 }))
      .filter((x) => x.ingreso > 0)
      .sort((a, b) => b.ingreso - a.ingreso);

    const srvMap = new Map<string, { nombre: string; ingreso: number; sesiones: number }>();
    for (const a of atns)
      for (const it of a.items) {
        const cur = srvMap.get(it.nombre) ?? { nombre: it.nombre, ingreso: 0, sesiones: 0 };
        cur.ingreso += N(it.monto);
        cur.sesiones += 1;
        srvMap.set(it.nombre, cur);
      }
    const porServicio = [...srvMap.values()].sort((a, b) => b.ingreso - a.ingreso);

    return { desde, hasta, ingresos, atenciones: atns.length, tasaAsistencia, pacientes, serieIngresos, porPsicologo, porServicio };
  }

  async caja(fecha: string) {
    const pagos = await this.prisma.pago.findMany({
      where: { anulado: false, fecha, atencion: { is: { anulada: false } } },
      include: { atencion: { include: { paciente: true } } },
    });
    const total = pagos.reduce((s, p) => s + N(p.monto), 0);
    const porMetodo: Record<string, number> = {};
    for (const p of pagos) porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + N(p.monto);
    return {
      fecha,
      total,
      count: pagos.length,
      porMetodo,
      pagos: pagos.map((p) => ({
        id: p.id,
        monto: N(p.monto),
        metodo: p.metodo,
        tipo: p.tipo,
        paciente: p.atencion ? `${p.atencion.paciente.nombres} ${p.atencion.paciente.apellidos}` : '—',
      })),
    };
  }

  async dashboard() {
    const hoy = hoyIso();
    const mesIni = hoy.slice(0, 8) + '01';
    const hace30 = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toLocaleDateString('en-CA');
    })();

    const [citasHoy, pagosMes, pacientesActivos, atenciones, citasRecientes] = await Promise.all([
      this.prisma.cita.count({ where: { fecha: hoy } }),
      this.prisma.pago.findMany({ where: { anulado: false, fecha: { gte: mesIni, lte: hoy }, atencion: { is: { anulada: false } } } }),
      this.prisma.paciente.count({ where: { estado: 'Activo' } }),
      this.prisma.atencion.findMany({ where: { anulada: false }, select: { saldo: true } }),
      this.prisma.cita.findMany({ where: { fecha: { gte: hace30, lte: hoy } }, select: { estado: true } }),
    ]);

    const ingresosMes = pagosMes.reduce((s, p) => s + N(p.monto), 0);
    const porCobrar = atenciones.reduce((s, a) => s + N(a.saldo), 0);

    const estadosMap = new Map<string, number>();
    for (const c of citasRecientes) estadosMap.set(c.estado, (estadosMap.get(c.estado) ?? 0) + 1);
    const estadosCitas = [...estadosMap.entries()].map(([estado, value]) => ({ estado, value }));

    return { citasHoy, ingresosMes, pacientesActivos, porCobrar, estadosCitas };
  }
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('reportes')
  reportes(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.service.reportes(desde ?? '0000-01-01', hasta ?? '9999-12-31');
  }
  @Get('caja')
  caja(@Query('fecha') fecha?: string) {
    return this.service.caja(fecha ?? hoyIso());
  }
  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
