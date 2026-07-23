import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const D = (v: number) => new Prisma.Decimal(v);
const iso = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toLocaleDateString('en-CA');
};

async function main() {
  console.log('Limpiando…');
  await prisma.pago.deleteMany();
  await prisma.atencionItem.deleteMany();
  await prisma.atencion.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.paquetePaciente.deleteMany();
  await prisma.evolucionSesion.deleteMany();
  await prisma.evaluacionNeuro.deleteMany();
  await prisma.paquete.deleteMany();
  await prisma.servicio.deleteMany();
  await prisma.psicologo.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.config.deleteMany();

  console.log('Roles y usuarios…');
  await prisma.role.createMany({
    data: [
      { id: 1, nombre: 'Administrador', short: 'Admin', descripcion: 'Administración total del centro', color: '#14a89c' },
      { id: 2, nombre: 'Psicólogo', short: 'Psicólogo', descripcion: 'Atención clínica y sus pacientes', color: '#2b83c2' },
      { id: 3, nombre: 'Recepción', short: 'Recepción', descripcion: 'Agenda, citas, cobros y asistencia', color: '#e8774a' },
    ],
  });
  const password = await bcrypt.hash('demo123', 10);
  await prisma.user.createMany({
    data: [
      { nombre: 'Erik Zerpa', email: 'admin@serycrecer.pe', password, roleId: 1, title: 'Administrador General' },
      { nombre: 'Lic. Camila Torres', email: 'psicologo@serycrecer.pe', password, roleId: 2, title: 'Psicóloga Clínica' },
      { nombre: 'Andrea Flores', email: 'recepcion@serycrecer.pe', password, roleId: 3, title: 'Recepcionista' },
    ],
  });

  console.log('Config…');
  await prisma.config.create({
    data: {
      id: 1, nombre: 'Ser y Crecer', ruc: '20123456789',
      direccion: 'Av. Arequipa 1234, Lince — Lima', telefono: '(01) 555-1234',
      email: 'contacto@serycrecer.pe', horario: 'Lunes a Sábado · 8:00–20:00', moneda: 'PEN',
    },
  });

  console.log('Psicólogos y servicios…');
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

  console.log('Paquetes…');
  const paq1 = await prisma.paquete.create({ data: { nombre: 'Paquete 4 sesiones · Terapia individual', sesiones: 4, precio: D(280), color: '#14a89c', servicioId: srv[0].id } });
  await prisma.paquete.create({ data: { nombre: 'Paquete 8 sesiones · Terapia individual', sesiones: 8, precio: D(520), color: '#2b83c2', servicioId: srv[0].id } });
  await prisma.paquete.create({ data: { nombre: 'Paquete 4 sesiones · Terapia infantil', sesiones: 4, precio: D(300), color: '#4fa64a', servicioId: srv[3].id } });

  console.log('Pacientes…');
  const P = (d: any) => prisma.paciente.create({ data: d });
  const [pac1, pac2, , pac4, pac5, pac6] = await Promise.all([
    P({ tipoDoc: 'DNI', numDoc: '45872103', nombres: 'Lucía', apellidos: 'Vega Ramírez', sexo: 'Femenino', fechaNacimiento: '1995-03-12', telefono: '987654321', email: 'lucia.vega@gmail.com', motivoConsulta: 'Ansiedad y estrés laboral' }),
    P({ tipoDoc: 'DNI', numDoc: '40125896', nombres: 'Diego', apellidos: 'Ramos Flores', sexo: 'Masculino', fechaNacimiento: '1988-07-25', telefono: '912345678', email: 'diego.ramos@outlook.com', motivoConsulta: 'Manejo de duelo' }),
    P({ tipoDoc: 'DNI', numDoc: '72564891', nombres: 'María', apellidos: 'Flores Quispe', sexo: 'Femenino', fechaNacimiento: '1992-11-08', telefono: '998877665', motivoConsulta: 'Terapia de pareja' }),
    P({ tipoDoc: 'CE', numDoc: '001234567', nombres: 'Jorge', apellidos: 'Salas Medina', sexo: 'Masculino', fechaNacimiento: '1979-05-30', telefono: '945612378', motivoConsulta: 'Depresión' }),
    P({ tipoDoc: 'DNI', numDoc: '48219075', nombres: 'Camila', apellidos: 'Rojas Díaz', sexo: 'Femenino', fechaNacimiento: '2001-09-17', telefono: '976543210', motivoConsulta: 'Ataques de pánico' }),
    P({ tipoDoc: 'DNI', numDoc: '70154238', nombres: 'Sebastián', apellidos: 'Núñez Paredes', sexo: 'Masculino', fechaNacimiento: '2015-04-02', telefono: '933221100', contactoNombre: 'Patricia Paredes (madre)', contactoTelefono: '933000555', motivoConsulta: 'Terapia infantil — conducta' }),
  ]);
  await Promise.all([
    P({ tipoDoc: 'DNI', numDoc: '41963258', nombres: 'Valeria', apellidos: 'Chávez Soto', sexo: 'Femenino', fechaNacimiento: '1990-12-24', telefono: '965874123', motivoConsulta: 'Estrés y autoestima' }),
    P({ tipoDoc: 'DNI', numDoc: '73852149', nombres: 'Fernanda', apellidos: 'Cárdenas Ruiz', sexo: 'Femenino', fechaNacimiento: '1998-08-19', telefono: '941258963', motivoConsulta: 'Ansiedad social' }),
    P({ tipoDoc: 'DNI', numDoc: '44758963', nombres: 'Ricardo', apellidos: 'Ponce Vargas', sexo: 'Masculino', fechaNacimiento: '1983-06-11', telefono: '929384756', motivoConsulta: 'Estrés postraumático' }),
  ]);
  const pac10 = await prisma.paciente.findFirst({ where: { numDoc: '44758963' } });

  console.log('Paquete de paciente (Lucía)…');
  const pp1 = await prisma.paquetePaciente.create({
    data: { pacienteId: pac1.id, paqueteId: paq1.id, nombre: paq1.nombre, totalSesiones: 4, precio: D(280), fecha: iso(-10) },
  });

  console.log('Citas…');
  const C = (pacienteId: number, psicologoId: number, servicioId: number, fecha: string, hora: string, estado: string, extra: any = {}) =>
    prisma.cita.create({ data: { pacienteId, psicologoId, servicioId, fecha, hora, estado, ...extra } });
  await Promise.all([
    C(pac1.id, psi1.id, srv[0].id, iso(0), '09:00', 'Confirmada', { paquetePacienteId: pp1.id }),
    C(pac2.id, psi1.id, srv[1].id, iso(0), '10:30', 'Confirmada'),
    C(pac4.id, psi2.id, srv[2].id, iso(0), '12:00', 'Agendada'),
    C(pac5.id, psi1.id, srv[0].id, iso(0), '16:00', 'Agendada'),
    C(pac6.id, psi3.id, srv[3].id, iso(0), '17:00', 'Confirmada'),
    C(pac1.id, psi1.id, srv[0].id, iso(-7), '09:00', 'Atendida'),
    C(pac4.id, psi1.id, srv[0].id, iso(-3), '15:00', 'No asistió'),
  ]);

  console.log('Atenciones (con abono parcial)…');
  // Pagada con Yape
  const a1 = await prisma.atencion.create({
    data: { pacienteId: pac1.id, psicologoId: psi1.id, fecha: iso(-7), hora: '09:00', observaciones: 'Sesión de seguimiento.', total: D(80), pagado: D(80), saldo: D(0), estado: 'Pagado',
      items: { create: [{ tipo: 'Servicio', nombre: 'Terapia individual', monto: D(80), servicioId: srv[0].id }] },
      pagos: { create: [{ monto: D(80), metodo: 'Yape', tipo: 'Abono inicial', fecha: iso(-7) }] } },
  });
  // Parcial: total 160, abonó 80 → saldo 80
  const a2 = await prisma.atencion.create({
    data: { pacienteId: pac10!.id, psicologoId: psi2.id, fecha: iso(-2), hora: '12:00', observaciones: 'Primera sesión familiar.', total: D(160), pagado: D(80), saldo: D(80), estado: 'Parcial',
      items: { create: [{ tipo: 'Servicio', nombre: 'Terapia familiar', monto: D(160), servicioId: srv[4].id }] },
      pagos: { create: [{ monto: D(80), metodo: 'Efectivo', tipo: 'Abono inicial', fecha: iso(-2) }] } },
  });
  console.log(`Atenciones: ${a1.id}, ${a2.id}`);

  console.log('✔ Seed completo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
