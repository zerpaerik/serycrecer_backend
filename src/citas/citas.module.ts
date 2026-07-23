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
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreateCitaDto {
  @Type(() => Number) @IsInt() pacienteId: number;
  @Type(() => Number) @IsInt() psicologoId: number;
  @Type(() => Number) @IsInt() servicioId: number;
  @IsString() fecha: string;
  @IsString() hora: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsBoolean() tardanza?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() paquetePacienteId?: number;
  @IsOptional() @IsString() notas?: string;
}
class UpdateCitaDto extends PartialType(CreateCitaDto) {}
class EstadoDto {
  @IsString() estado: string;
  @IsOptional() @IsBoolean() tardanza?: boolean;
}

const INCLUDE = { paciente: true, psicologo: true, servicio: true, paquetePaciente: true };

@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(fecha?: string, search?: string) {
    return this.prisma.cita.findMany({
      where: {
        ...(fecha ? { fecha } : {}),
        ...(search
          ? {
              paciente: {
                OR: [
                  { nombres: { contains: search, mode: 'insensitive' } },
                  { apellidos: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      include: INCLUDE,
    });
  }

  async findOne(id: number) {
    const c = await this.prisma.cita.findUnique({ where: { id }, include: INCLUDE });
    if (!c) throw new NotFoundException(`Cita #${id} no encontrada`);
    return c;
  }

  create(dto: CreateCitaDto) {
    return this.prisma.cita.create({ data: dto, include: INCLUDE });
  }

  async update(id: number, dto: UpdateCitaDto) {
    await this.findOne(id);
    return this.prisma.cita.update({ where: { id }, data: dto, include: INCLUDE });
  }

  async setEstado(id: number, dto: EstadoDto) {
    await this.findOne(id);
    return this.prisma.cita.update({
      where: { id },
      data: { estado: dto.estado, ...(dto.tardanza !== undefined ? { tardanza: dto.tardanza } : {}) },
      include: INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.cita.delete({ where: { id } });
    return { id, deleted: true };
  }
}

@Controller('citas')
export class CitasController {
  constructor(private readonly service: CitasService) {}

  @Get() findAll(@Query('fecha') fecha?: string, @Query('search') search?: string) {
    return this.service.findAll(fecha, search);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreateCitaDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id/estado') setEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EstadoDto,
  ) {
    return this.service.setEstado(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCitaDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [CitasController],
  providers: [CitasService],
})
export class CitasModule {}
