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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

// ── Evaluación neuropsicológica (una por paciente) ──
class UpsertEvaluacionDto {
  @IsOptional() @IsObject() respuestas?: Record<string, unknown>;
  @IsOptional() @IsArray() objetivos?: unknown[];
  @IsOptional() @IsString() obsConducta?: string;
  @IsOptional() @IsString() obsFamilia?: string;
  @IsOptional() @IsString() obsEscolar?: string;
  @IsOptional() @IsString() informe?: string;
}

// ── Evoluciones por sesión ──
class CreateEvolucionDto {
  @Type(() => Number) @IsInt() pacienteId: number;
  @Type(() => Number) @IsInt() psicologoId: number;
  @IsOptional() @Type(() => Number) @IsInt() atencionId?: number;
  @IsString() fecha: string;
  @IsString() hora: string;
  @IsOptional() @IsString() motivo?: string;
  @IsString() observaciones: string;
  @IsOptional() @IsString() acuerdos?: string;
}
class UpdateEvolucionDto extends PartialType(CreateEvolucionDto) {}

@Injectable()
export class HistoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvaluacion(pacienteId: number) {
    const ev = await this.prisma.evaluacionNeuro.findUnique({ where: { pacienteId } });
    return ev ?? { pacienteId, respuestas: {}, objetivos: [], obsConducta: null, obsFamilia: null, obsEscolar: null, informe: null };
  }

  upsertEvaluacion(pacienteId: number, dto: UpsertEvaluacionDto) {
    const data = {
      respuestas: (dto.respuestas ?? {}) as any,
      objetivos: (dto.objetivos ?? []) as any,
      obsConducta: dto.obsConducta,
      obsFamilia: dto.obsFamilia,
      obsEscolar: dto.obsEscolar,
      informe: dto.informe,
    };
    return this.prisma.evaluacionNeuro.upsert({
      where: { pacienteId },
      update: data,
      create: { pacienteId, ...data },
    });
  }

  listEvoluciones(pacienteId?: number) {
    return this.prisma.evolucionSesion.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
      include: { psicologo: true },
    });
  }

  createEvolucion(dto: CreateEvolucionDto) {
    return this.prisma.evolucionSesion.create({ data: dto, include: { psicologo: true } });
  }

  async updateEvolucion(id: number, dto: UpdateEvolucionDto) {
    const ex = await this.prisma.evolucionSesion.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Evolución #${id} no encontrada`);
    return this.prisma.evolucionSesion.update({ where: { id }, data: dto, include: { psicologo: true } });
  }

  async removeEvolucion(id: number) {
    const ex = await this.prisma.evolucionSesion.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Evolución #${id} no encontrada`);
    await this.prisma.evolucionSesion.delete({ where: { id } });
    return { id, deleted: true };
  }
}

// Historia clínica: confidencial → todas las rutas requieren JWT.
@UseGuards(JwtAuthGuard)
@Controller()
export class HistoriaController {
  constructor(private readonly service: HistoriaService) {}

  @Get('evaluaciones/:pacienteId')
  getEvaluacion(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    return this.service.getEvaluacion(pacienteId);
  }
  @Put('evaluaciones/:pacienteId')
  upsertEvaluacion(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Body() dto: UpsertEvaluacionDto,
  ) {
    return this.service.upsertEvaluacion(pacienteId, dto);
  }

  @Get('evoluciones')
  listEvoluciones(@Query('pacienteId') pacienteId?: string) {
    return this.service.listEvoluciones(pacienteId ? Number(pacienteId) : undefined);
  }
  @Post('evoluciones')
  createEvolucion(@Body() dto: CreateEvolucionDto) {
    return this.service.createEvolucion(dto);
  }
  @Patch('evoluciones/:id')
  updateEvolucion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEvolucionDto) {
    return this.service.updateEvolucion(id, dto);
  }
  @Delete('evoluciones/:id')
  removeEvolucion(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeEvolucion(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [HistoriaController],
  providers: [HistoriaService],
})
export class HistoriaModule {}
