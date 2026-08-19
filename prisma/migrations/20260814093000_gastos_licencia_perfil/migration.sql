-- AlterTable: licencia profesional del psicólogo
ALTER TABLE "Psicologo" ADD COLUMN "licencia" TEXT;

-- AlterTable: enlace opcional usuario -> psicólogo
ALTER TABLE "User" ADD COLUMN "psicologoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_psicologoId_key" ON "User"("psicologoId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_psicologoId_fkey" FOREIGN KEY ("psicologoId") REFERENCES "Psicologo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Gasto" (
    "id" SERIAL NOT NULL,
    "fecha" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Operativo',
    "metodo" TEXT NOT NULL DEFAULT 'Efectivo',
    "descripcion" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
