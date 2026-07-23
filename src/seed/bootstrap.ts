import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const D = (v: number) => new Prisma.Decimal(v);
const iso = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toLocaleDateString('en-CA');
};

/**
 * Crea los datos base de forma idempotente al arrancar la app.
 * - Roles, usuarios demo y configuración: upsert (siempre, no destruye nada).
 * - Catálogos y datos demo: solo si las tablas están vacías.
 * Garantiza que el login funcione en producción sin correr el seed a mano.
 */
export async function ensureBaseData(prisma: PrismaService) {
  // Roles
  const roles = [
    { id: 1, nombre: 'Administrador', short: 'Admin', descripcion: 'Administración total del centro', color: '#14a89c' },
    { id: 2, nombre: 'Psicólogo', short: 'Psicólogo', descripcion: 'Atención clínica y sus pacientes', color: '#2b83c2' },
    { id: 3, nombre: 'Recepción', short: 'Recepción', descripcion: 'Agenda, citas, cobros y asistencia', color: '#e8774a' },
  ];
  for (const r of roles) {
    await prisma.role.upsert({ where: { id: r.id }, update: { nombre: r.nombre, short: r.short, descripcion: r.descripcion, color: r.color }, create: r });
  }

  // Usuarios demo (idempotente por email; contraseña demo123)
  const password = await bcrypt.hash('demo123', 10);
  const users = [
    { email: 'admin@serycrecer.pe', nombre: 'Erik Zerpa', roleId: 1, title: 'Administrador General' },
    { email: 'psicologo@serycrecer.pe', nombre: 'Lic. Camila Torres', roleId: 2, title: 'Psicóloga Clínica' },
    { email: 'recepcion@serycrecer.pe', nombre: 'Andrea Flores', roleId: 3, title: 'Recepcionista' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, roleId: u.roleId, title: u.title },
      create: { ...u, password },
    });
  }

  // Config
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1, nombre: 'Ser y Crecer', ruc: '20123456789',
      direccion: 'Av. Arequipa 1234, Lince — Lima', telefono: '(01) 555-1234',
      email: 'contacto@serycrecer.pe', horario: 'Lunes a Sábado · 8:00–20:00', moneda: 'PEN',
    },
  });

  // Catálogos demo (solo si no hay servicios aún)
  if ((await prisma.servicio.count()) === 0) {
    const [psi1, psi2, psi3] = await Promise.all([
      prisma.psicologo.create({ data: { nombre: 'Lic. Camila Torres', especialidad: 'Psicología clínica', color: '#8b5cf6', email: 'psicologo@serycrecer.pe', telefono: '987111000', horario: 'Lun a Vie · 9:00–18:00' } }),
      prisma.psicologo.create({ data: { nombre: 'Lic. Mateo Ríos', especialidad: 'Terapia de pareja y familia', color: '#2b83c2', email: 'mateo.rios@serycrecer.pe', telefono: '987222000', horario: 'Lun, Mié, Vie · 10:00–19:00' } }),
      prisma.psicologo.create({ data: { nombre: 'Lic. Ana Beltrán', especialidad: 'Psicología infantil', color: '#14a89c', email: 'ana.beltran@serycrecer.pe', telefono: '987333000', horario: 'Mar a Sáb · 8:00–15:00' } }),
    ]);
    const srv = await Promise.all([
      prisma.servicio.create({ data: { nombre: 'Terapia individual', duracionMin: 50, precio: D(80), color: '#14a89c' } }),
      prisma.servicio.create({ data: { nombre: 'Evaluación inicial', duracionMin: 60, precio: D(120), color: '#2b83c2' } }),
      prisma.servicio.create({ data: { nombre: 'Terapia de pareja', duracionMin: 60, precio: D(150), color: '#8b5cf6' } }),
      prisma.servicio.create({ data: { nombre: 'Terapia infantil', duracionMin: 45, precio: D(90), color: '#f4b21f' } }),
      prisma.servicio.create({ data: { nombre: 'Terapia familiar', duracionMin: 60, precio: D(160), color: '#e8774a' } }),
    ]);
    const paq1 = await prisma.paquete.create({ data: { nombre: 'Paquete 4 sesiones · Terapia individual', sesiones: 4, precio: D(280), color: '#14a89c', servicioId: srv[0].id } });
    await prisma.paquete.create({ data: { nombre: 'Paquete 8 sesiones · Terapia individual', sesiones: 8, precio: D(520), color: '#2b83c2', servicioId: srv[0].id } });
    await prisma.paquete.create({ data: { nombre: 'Paquete 4 sesiones · Terapia infantil', sesiones: 4, precio: D(300), color: '#4fa64a', servicioId: srv[3].id } });

    // Pacientes + citas + atenciones demo (solo si no hay pacientes)
    if ((await prisma.paciente.count()) === 0) {
      const pac1 = await prisma.paciente.create({ data: { tipoDoc: 'DNI', numDoc: '45872103', nombres: 'Lucía', apellidos: 'Vega Ramírez', sexo: 'Femenino', fechaNacimiento: '1995-03-12', telefono: '987654321', email: 'lucia.vega@gmail.com', motivoConsulta: 'Ansiedad y estrés laboral' } });
      const pac2 = await prisma.paciente.create({ data: { tipoDoc: 'DNI', numDoc: '40125896', nombres: 'Diego', apellidos: 'Ramos Flores', sexo: 'Masculino', fechaNacimiento: '1988-07-25', telefono: '912345678', email: 'diego.ramos@outlook.com', motivoConsulta: 'Manejo de duelo' } });
      const pac3 = await prisma.paciente.create({ data: { tipoDoc: 'DNI', numDoc: '72564891', nombres: 'María', apellidos: 'Flores Quispe', sexo: 'Femenino', fechaNacimiento: '1992-11-08', telefono: '998877665', motivoConsulta: 'Terapia de pareja' } });
      const pac6 = await prisma.paciente.create({ data: { tipoDoc: 'DNI', numDoc: '70154238', nombres: 'Sebastián', apellidos: 'Núñez Paredes', sexo: 'Masculino', fechaNacimiento: '2015-04-02', telefono: '933221100', contactoNombre: 'Patricia Paredes (madre)', contactoTelefono: '933000555', motivoConsulta: 'Terapia infantil — conducta' } });

      const pp1 = await prisma.paquetePaciente.create({ data: { pacienteId: pac1.id, paqueteId: paq1.id, nombre: paq1.nombre, totalSesiones: 4, precio: D(280), fecha: iso(-10) } });

      await Promise.all([
        prisma.cita.create({ data: { pacienteId: pac1.id, psicologoId: psi1.id, servicioId: srv[0].id, fecha: iso(0), hora: '09:00', estado: 'Confirmada', paquetePacienteId: pp1.id } }),
        prisma.cita.create({ data: { pacienteId: pac2.id, psicologoId: psi1.id, servicioId: srv[1].id, fecha: iso(0), hora: '10:30', estado: 'Confirmada' } }),
        prisma.cita.create({ data: { pacienteId: pac3.id, psicologoId: psi2.id, servicioId: srv[2].id, fecha: iso(0), hora: '12:00', estado: 'Agendada' } }),
        prisma.cita.create({ data: { pacienteId: pac6.id, psicologoId: psi3.id, servicioId: srv[3].id, fecha: iso(0), hora: '17:00', estado: 'Confirmada' } }),
        prisma.cita.create({ data: { pacienteId: pac1.id, psicologoId: psi1.id, servicioId: srv[0].id, fecha: iso(-7), hora: '09:00', estado: 'Atendida' } }),
      ]);

      await prisma.atencion.create({
        data: { pacienteId: pac1.id, psicologoId: psi1.id, fecha: iso(-7), hora: '09:00', observaciones: 'Sesión de seguimiento.', total: D(80), pagado: D(80), saldo: D(0), estado: 'Pagado',
          items: { create: [{ tipo: 'Servicio', nombre: 'Terapia individual', monto: D(80), servicioId: srv[0].id }] },
          pagos: { create: [{ monto: D(80), metodo: 'Yape', tipo: 'Abono inicial', fecha: iso(-7) }] } },
      });
      await prisma.atencion.create({
        data: { pacienteId: pac3.id, psicologoId: psi2.id, fecha: iso(-2), hora: '12:00', observaciones: 'Primera sesión familiar.', total: D(160), pagado: D(80), saldo: D(80), estado: 'Parcial',
          items: { create: [{ tipo: 'Servicio', nombre: 'Terapia familiar', monto: D(160), servicioId: srv[4].id }] },
          pagos: { create: [{ monto: D(80), metodo: 'Efectivo', tipo: 'Abono inicial', fecha: iso(-2) }] } },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('✔ Datos base verificados (roles, usuarios demo, catálogos).');
}
