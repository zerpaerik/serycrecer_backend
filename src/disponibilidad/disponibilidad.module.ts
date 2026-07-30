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
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreateDisponibilidadDto {
  @Type(() => Number) @IsInt() psicologoId: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(6) diaSemana: number;
  @IsString() horaInicio: string;
  @IsString() horaFin: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) duracionMin?: number;
}
class UpdateDisponibilidadDto extends PartialType(CreateDisponibilidadDto) {}

@Injectable()
export class DisponibilidadService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(psicologoId?: number) {
    return this.prisma.disponibilidad.findMany({
      where: psicologoId ? { psicologoId } : undefined,
      orderBy: [{ psicologoId: 'asc' }, { diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  create(dto: CreateDisponibilidadDto) {
    return this.prisma.disponibilidad.create({ data: dto });
  }

  async update(id: number, dto: UpdateDisponibilidadDto) {
    const ex = await this.prisma.disponibilidad.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Disponibilidad #${id} no encontrada`);
    return this.prisma.disponibilidad.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const ex = await this.prisma.disponibilidad.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException(`Disponibilidad #${id} no encontrada`);
    await this.prisma.disponibilidad.delete({ where: { id } });
    return { id, deleted: true };
  }
}

@Controller('disponibilidad')
export class DisponibilidadController {
  constructor(private readonly service: DisponibilidadService) {}

  @Get() findAll(@Query('psicologoId') psicologoId?: string) {
    return this.service.findAll(psicologoId ? Number(psicologoId) : undefined);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreateDisponibilidadDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisponibilidadDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [DisponibilidadController],
  providers: [DisponibilidadService],
})
export class DisponibilidadModule {}
