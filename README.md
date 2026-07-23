# Ser y Crecer — API

Backend del **Centro Neuropsicológico Ser y Crecer**. NestJS 11 + Prisma 6 + PostgreSQL.
Réplica de la arquitectura de `intimas_backend`, modelado sobre el frontend `serycrecer_frontend`.

## Stack

- **NestJS 11** (un archivo por módulo: DTOs + service + controller + `@Module`)
- **Prisma 6** + **PostgreSQL**
- **JWT** (hecho a mano con `@nestjs/jwt`) + **bcryptjs**
- **class-validator / class-transformer** (ValidationPipe global)
- Prefijo global `/api`, CORS por lista de orígenes, TZ `America/Lima`

## Requisitos

- Node ≥ 20
- PostgreSQL (local con Docker o Railway)

## Puesta en marcha (local)

```bash
cp .env.example .env          # ajusta DATABASE_URL

# Postgres local con Docker (opcional)
docker run -d --name serycrecer-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=serycrecer -p 5544:5432 postgres:16-alpine

npm install
npx prisma migrate dev        # crea/aplica migraciones + genera el cliente
npm run db:seed               # datos demo (usuarios, catálogos, pacientes…)
npm run start:dev             # http://localhost:3001/api
```

**Usuarios demo** (contraseña `demo123`):
`admin@serycrecer.pe` · `psicologo@serycrecer.pe` · `recepcion@serycrecer.pe`

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Railway la inyecta) |
| `JWT_SECRET` | Secreto para firmar los JWT |
| `PORT` | Puerto (Railway lo inyecta; por defecto 3001) |
| `CORS_ORIGIN` | Orígenes permitidos, coma-separados (`*` = todos) |

## Deploy en Railway

1. Crea un proyecto en Railway y añade un servicio **PostgreSQL** (expone `DATABASE_URL`).
2. Conecta este repo como servicio. Railway usa `railway.json`:
   - build: `npm run build`
   - start: `npm run start:railway` → `prisma migrate deploy && node dist/main`
3. Configura las variables: `JWT_SECRET`, `CORS_ORIGIN` (la URL del frontend).
4. Las migraciones se aplican solas al desplegar.

## Endpoints principales

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | JWT |
| GET/POST/PATCH/DELETE | `/api/pacientes` | lectura pública, escritura JWT |
| GET/POST/PATCH/DELETE | `/api/citas` (+ `PATCH /:id/estado`) | |
| GET/POST | `/api/atenciones` (ítems + pagos) | |
| POST | `/api/atenciones/:id/pagos` | JWT — registra un abono |
| POST | `/api/atenciones/:id/anular` | JWT — anula (soft-delete) |
| GET/POST/PATCH/DELETE | `/api/servicios` · `/api/paquetes` · `/api/psicologos` · `/api/usuarios` | |
| GET | `/api/pacientes/:id/historial` | citas, atenciones y paquetes |
| GET/PATCH | `/api/config` | |

**Nota:** los montos (`Decimal`) se serializan como *string* en el JSON; el frontend los parsea con `Number(...)`.

## Modelo de datos

Atención = cabecera con `items[]` (servicios/paquetes) y `pagos[]` (abonos);
`total/pagado/saldo/estado` (Pagado·Parcial·Pendiente) se recalculan en cada
operación dentro de una transacción. Comprar un ítem de tipo *Paquete* crea un
`PaquetePaciente` (bolsa de sesiones) que las citas consumen vía `paquetePacienteId`.

## Fases

- **Fase 1 (esta)** ✅ — base, auth, catálogos, pacientes, citas, atenciones (ítems/pagos/abonos/anular), paquetes.
- **Fase 2** — historia clínica (evaluación neuropsicológica), evoluciones, asistencia, reportes, caja/dashboard.
- **Fase 3** — integración del frontend (reemplazar el store mock por llamadas a esta API).
