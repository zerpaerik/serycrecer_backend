import 'reflect-metadata';
// Zona horaria del centro (Perú) antes de crear la app.
process.env.TZ = process.env.TZ || 'America/Lima';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ensureBaseData } from './seed/bootstrap';

function corsOrigins(): string[] {
  return (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const allowed = corsOrigins();
  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      // Sin origin (curl / health checks) o comodín.
      if (!origin || allowed.includes('*')) return cb(null, true);
      const clean = origin.replace(/\/$/, '');
      if (allowed.includes(clean)) return cb(null, true);
      // Cualquier despliegue de Railway/Vercel.
      if (/\.up\.railway\.app$/.test(clean) || /\.vercel\.app$/.test(clean)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
  });

  // Garantiza datos base (roles, usuarios demo, catálogos) de forma idempotente.
  try {
    await ensureBaseData(app.get(PrismaService));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('No se pudo asegurar los datos base:', e);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Ser y Crecer API escuchando en :${port}/api`);
}
void bootstrap();
