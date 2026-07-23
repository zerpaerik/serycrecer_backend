import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreatePaqueteDto {
  @IsString() nombre: string;
  @Type(() => Number) @IsInt() @Min(1) sesiones: number;
  @Type(() => Number) @IsNumber() @Min(0) precio: number;
  @IsString() color: string;
  @IsOptional() @Type(() => Number) @IsInt() servicioId?: number;
}
class UpdatePaqueteDto extends PartialType(CreatePaqueteDto) {}

@Injectable()
export class PaquetesService extends BaseCrudService<PrismaService['paquete']> {
  constructor(prisma: PrismaService) {
    super(prisma.paquete, ['nombre'], {
      orderBy: { id: 'asc' },
      include: { servicio: true },
    });
  }
}

@Controller('paquetes')
export class PaquetesController {
  constructor(private readonly service: PaquetesService) {}

  @Get() findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreatePaqueteDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaqueteDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PaquetesController],
  providers: [PaquetesService],
})
export class PaquetesModule {}
