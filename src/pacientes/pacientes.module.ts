import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreatePacienteDto {
  @IsOptional() @IsString() tipoDoc?: string;
  @IsString() numDoc: string;
  @IsString() nombres: string;
  @IsString() apellidos: string;
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsString() fechaNacimiento?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() contactoNombre?: string;
  @IsOptional() @IsString() contactoTelefono?: string;
  @IsOptional() @IsString() motivoConsulta?: string;
  @IsOptional() @IsString() estado?: string;
}
class UpdatePacienteDto extends PartialType(CreatePacienteDto) {}

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { nombres: { contains: search, mode: 'insensitive' as const } },
            { apellidos: { contains: search, mode: 'insensitive' as const } },
            { numDoc: { contains: search, mode: 'insensitive' as const } },
            { telefono: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;
    return this.prisma.paciente.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.paciente.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Paciente #${id} no encontrado`);
    return p;
  }

  create(dto: CreatePacienteDto) {
    return this.prisma.paciente.create({ data: dto });
  }

  async update(id: number, dto: UpdatePacienteDto) {
    await this.findOne(id);
    return this.prisma.paciente.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.paciente.delete({ where: { id } });
    return { id, deleted: true };
  }

  async historial(id: number) {
    const paciente = await this.findOne(id);
    const [citas, atenciones, paquetes] = await Promise.all([
      this.prisma.cita.findMany({
        where: { pacienteId: id },
        orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
        include: { psicologo: true, servicio: true },
      }),
      this.prisma.atencion.findMany({
        where: { pacienteId: id, anulada: false },
        orderBy: { fecha: 'desc' },
        include: { items: true, pagos: { where: { anulado: false } } },
      }),
      this.prisma.paquetePaciente.findMany({ where: { pacienteId: id } }),
    ]);
    return { paciente, citas, atenciones, paquetes };
  }
}

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly service: PacientesService) {}

  @Get() findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }
  @Get(':id/historial') historial(@Param('id', ParseIntPipe) id: number) {
    return this.service.historial(id);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreatePacienteDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePacienteDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PacientesController],
  providers: [PacientesService],
})
export class PacientesModule {}
