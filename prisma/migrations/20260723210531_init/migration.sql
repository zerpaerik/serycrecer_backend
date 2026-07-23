-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "title" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Psicologo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "horario" TEXT,

    CONSTRAINT "Psicologo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paquete" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "sesiones" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "color" TEXT NOT NULL,
    "servicioId" INTEGER,

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaquetePaciente" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "paqueteId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "totalSesiones" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "fecha" TEXT NOT NULL,
    "atencionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaquetePaciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "tipoDoc" TEXT NOT NULL DEFAULT 'DNI',
    "numDoc" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "sexo" TEXT NOT NULL DEFAULT 'Femenino',
    "fechaNacimiento" TEXT,
    "telefono" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "direccion" TEXT,
    "contactoNombre" TEXT,
    "contactoTelefono" TEXT,
    "motivoConsulta" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "psicologoId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Agendada',
    "tardanza" BOOLEAN NOT NULL DEFAULT false,
    "paquetePacienteId" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atencion" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "psicologoId" INTEGER NOT NULL,
    "citaId" INTEGER,
    "fecha" TEXT NOT NULL,
    "hora" TEXT,
    "observaciones" TEXT,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pagado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "anuladaAt" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtencionItem" (
    "id" SERIAL NOT NULL,
    "atencionId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "servicioId" INTEGER,
    "paqueteId" INTEGER,

    CONSTRAINT "AtencionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "atencionId" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'Efectivo',
    "tipo" TEXT NOT NULL DEFAULT 'Abono inicial',
    "fecha" TEXT NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionNeuro" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "respuestas" JSONB NOT NULL DEFAULT '{}',
    "objetivos" JSONB NOT NULL DEFAULT '[]',
    "obsConducta" TEXT,
    "obsFamilia" TEXT,
    "obsEscolar" TEXT,
    "informe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluacionNeuro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolucionSesion" (
    "id" SERIAL NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "psicologoId" INTEGER NOT NULL,
    "atencionId" INTEGER,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "motivo" TEXT,
    "observaciones" TEXT NOT NULL,
    "acuerdos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolucionSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL DEFAULT 'Ser y Crecer',
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "horario" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Paciente_numDoc_idx" ON "Paciente"("numDoc");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");

-- CreateIndex
CREATE INDEX "Atencion_fecha_idx" ON "Atencion"("fecha");

-- CreateIndex
CREATE INDEX "Atencion_pacienteId_idx" ON "Atencion"("pacienteId");

-- CreateIndex
CREATE INDEX "Atencion_anulada_idx" ON "Atencion"("anulada");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionNeuro_pacienteId_key" ON "EvaluacionNeuro"("pacienteId");

-- CreateIndex
CREATE INDEX "EvolucionSesion_pacienteId_idx" ON "EvolucionSesion"("pacienteId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaquetePaciente" ADD CONSTRAINT "PaquetePaciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaquetePaciente" ADD CONSTRAINT "PaquetePaciente_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_psicologoId_fkey" FOREIGN KEY ("psicologoId") REFERENCES "Psicologo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_paquetePacienteId_fkey" FOREIGN KEY ("paquetePacienteId") REFERENCES "PaquetePaciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atencion" ADD CONSTRAINT "Atencion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atencion" ADD CONSTRAINT "Atencion_psicologoId_fkey" FOREIGN KEY ("psicologoId") REFERENCES "Psicologo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atencion" ADD CONSTRAINT "Atencion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionItem" ADD CONSTRAINT "AtencionItem_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "Atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "Atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionNeuro" ADD CONSTRAINT "EvaluacionNeuro_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolucionSesion" ADD CONSTRAINT "EvolucionSesion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolucionSesion" ADD CONSTRAINT "EvolucionSesion_psicologoId_fkey" FOREIGN KEY ("psicologoId") REFERENCES "Psicologo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
