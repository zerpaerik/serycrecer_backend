import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const hoy = () => new Date().toLocaleDateString('en-CA');

class CreateGastoDto {
  @IsOptional() @IsString() fecha?: string;
  @Type(() => Number) @IsNumber() @Min(0) monto: number;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() metodo?: string;
  @IsOptional() @IsString() descripcion?: string;
}
class UpdateGastoDto extends PartialType(CreateGastoDto) {}

const INCLUDE = { usuario: { select: { id: true, nombre: true } } };

@Injectable()
export class GastosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(desde?: string, hasta?: string) {
    return this.prisma.gasto.findMany({
      where:
        desde || hasta
          ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
          : undefined,
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      include: INCLUDE,
    });
  }

  async findOne(id: number) {
    const g = await this.prisma.gasto.findUnique({ where: { id }, include: INCLUDE });
    if (!g) throw new NotFoundException(`Gasto #${id} no encontrado`);
    return g;
  }

  create(dto: CreateGastoDto, userId?: number) {
    return this.prisma.gasto.create({
      data: {
        fecha: dto.fecha ?? hoy(),
        monto: D(dto.monto),
        categoria: dto.categoria ?? 'Operativo',
        metodo: dto.metodo ?? 'Efectivo',
        descripcion: dto.descripcion,
        usuarioId: userId,
      },
      include: INCLUDE,
    });
  }

  async update(id: number, dto: UpdateGastoDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.fecha !== undefined) data.fecha = dto.fecha;
    if (dto.monto !== undefined) data.monto = D(dto.monto);
    if (dto.categoria !== undefined) data.categoria = dto.categoria;
    if (dto.metodo !== undefined) data.metodo = dto.metodo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    return this.prisma.gasto.update({ where: { id }, data, include: INCLUDE });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.gasto.delete({ where: { id } });
    return { id, deleted: true };
  }
}

// Recepción (rol 3) registra gastos pero no puede editarlos ni eliminarlos.
function bloquearRecepcion(req: Request) {
  if ((req as any).user?.roleId === 3) {
    throw new ForbiddenException('Recepción no puede editar ni eliminar gastos');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('gastos')
export class GastosController {
  constructor(private readonly service: GastosService) {}

  @Get() findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.findAll(desde, hasta);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @Post() create(@Body() dto: CreateGastoDto, @Req() req: Request) {
    return this.service.create(dto, (req as any).user?.sub);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGastoDto,
    @Req() req: Request,
  ) {
    bloquearRecepcion(req);
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    bloquearRecepcion(req);
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
