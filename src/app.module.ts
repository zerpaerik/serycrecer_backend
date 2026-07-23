import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PsicologosModule } from './psicologos/psicologos.module';
import { ServiciosModule } from './servicios/servicios.module';
import { PaquetesModule } from './paquetes/paquetes.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { CitasModule } from './citas/citas.module';
import { AtencionesModule } from './atenciones/atenciones.module';
import { ConfigAppModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    PsicologosModule,
    ServiciosModule,
    PaquetesModule,
    PacientesModule,
    CitasModule,
    AtencionesModule,
    ConfigAppModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
