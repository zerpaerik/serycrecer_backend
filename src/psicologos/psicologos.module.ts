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
import { BaseCrudService } from '../common/base-crud.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreatePsicologoDto {
  @IsString() nombre: string;
  @IsString() especialidad: string;
  @IsString() color: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() horario?: string;
  @IsOptional() @IsString() licencia?: string;
  @IsOptional() @IsString() estado?: string;
}
class UpdatePsicologoDto extends PartialType(CreatePsicologoDto) {}

@Injectable()
export class PsicologosService extends BaseCrudService<PrismaService['psicologo']> {
  constructor(private readonly prismaSvc: PrismaService) {
    super(prismaSvc.psicologo, ['nombre', 'especialidad', 'email'], { orderBy: { id: 'asc' } });
  }

  /**
   * Elimina el psicólogo si no tiene historial. Si tiene citas, atenciones o
   * evoluciones, no se puede borrar sin perder información: se desactiva
   * (estado "Inactivo") para que deje de aparecer al agendar.
   */
  async remove(id: number): Promise<{ id: number; deleted: boolean; desactivado?: boolean; mensaje?: string }> {
    const psi = await this.prismaSvc.psicologo.findUnique({ where: { id } });
    if (!psi) throw new NotFoundException(`Psicólogo #${id} no encontrado`);

    const [citas, atenciones, evoluciones] = await Promise.all([
      this.prismaSvc.cita.count({ where: { psicologoId: id } }),
      this.prismaSvc.atencion.count({ where: { psicologoId: id } }),
      this.prismaSvc.evolucionSesion.count({ where: { psicologoId: id } }),
    ]);

    if (citas + atenciones + evoluciones > 0) {
      await this.prismaSvc.psicologo.update({
        where: { id },
        data: { estado: 'Inactivo' },
      });
      return {
        id,
        deleted: false,
        desactivado: true,
        mensaje:
          `${psi.nombre} tiene historial (${citas} citas, ${atenciones} atenciones, ` +
          `${evoluciones} evoluciones), por lo que se desactivó en lugar de eliminarse.`,
      };
    }

    // Sin historial: se puede borrar de verdad (limpiando su disponibilidad).
    await this.prismaSvc.disponibilidad.deleteMany({ where: { psicologoId: id } });
    await this.prismaSvc.user.updateMany({ where: { psicologoId: id }, data: { psicologoId: null } });
    await this.prismaSvc.psicologo.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Reactiva un psicólogo desactivado. */
  reactivar(id: number) {
    return this.prismaSvc.psicologo.update({ where: { id }, data: { estado: 'Activo' } });
  }
}

@Controller('psicologos')
export class PsicologosController {
  constructor(private readonly service: PsicologosService) {}

  @Get() findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreatePsicologoDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePsicologoDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
  @UseGuards(JwtAuthGuard) @Post(':id/reactivar') reactivar(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivar(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PsicologosController],
  providers: [PsicologosService],
})
export class PsicologosModule {}
