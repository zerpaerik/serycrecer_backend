import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaquetesPacienteService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(pacienteId?: number) {
    return this.prisma.paquetePaciente.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: { id: 'desc' },
    });
  }
}

@Controller('paquetes-paciente')
export class PaquetesPacienteController {
  constructor(private readonly service: PaquetesPacienteService) {}

  @Get()
  findAll(@Query('pacienteId') pacienteId?: string) {
    return this.service.findAll(pacienteId ? Number(pacienteId) : undefined);
  }
}

@Module({
  controllers: [PaquetesPacienteController],
  providers: [PaquetesPacienteService],
})
export class PaquetesPacienteModule {}
