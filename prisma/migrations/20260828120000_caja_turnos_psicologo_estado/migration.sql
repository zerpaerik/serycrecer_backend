-- AlterTable: estado del psicólogo (para desactivar en vez de eliminar)
ALTER TABLE "Psicologo" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'Activo';

-- CreateTable: turnos de caja (un día puede tener varios)
CREATE TABLE "CajaTurno" (
    "id" SERIAL NOT NULL,
    "fecha" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Turno 1',
    "montoInicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "abiertoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEn" TIMESTAMP(3),
    "montoContado" DECIMAL(10,2),
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Abierto',
    "usuarioAperturaId" INTEGER,
    "usuarioCierreId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CajaTurno_fecha_idx" ON "CajaTurno"("fecha");

-- AlterTable: enlace de pagos y gastos al turno de caja
ALTER TABLE "Pago" ADD COLUMN "turnoId" INTEGER;
ALTER TABLE "Gasto" ADD COLUMN "turnoId" INTEGER;

-- AddForeignKey
ALTER TABLE "CajaTurno" ADD CONSTRAINT "CajaTurno_usuarioAperturaId_fkey" FOREIGN KEY ("usuarioAperturaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CajaTurno" ADD CONSTRAINT "CajaTurno_usuarioCierreId_fkey" FOREIGN KEY ("usuarioCierreId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "CajaTurno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "CajaTurno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
