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
import { IsInt, IsNumber, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCrudService } from '../common/base-crud.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreateServicioDto {
  @IsString() nombre: string;
  @Type(() => Number) @IsInt() @Min(1) duracionMin: number;
  @Type(() => Number) @IsNumber() @Min(0) precio: number;
  @IsString() color: string;
}
class UpdateServicioDto extends PartialType(CreateServicioDto) {}

@Injectable()
export class ServiciosService extends BaseCrudService<PrismaService['servicio']> {
  constructor(prisma: PrismaService) {
    super(prisma.servicio, ['nombre'], { orderBy: { id: 'asc' } });
  }
}

@Controller('servicios')
export class ServiciosController {
  constructor(private readonly service: ServiciosService) {}

  @Get() findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreateServicioDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicioDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ServiciosController],
  providers: [ServiciosService],
})
export class ServiciosModule {}
