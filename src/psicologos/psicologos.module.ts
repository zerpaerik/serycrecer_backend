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
}
class UpdatePsicologoDto extends PartialType(CreatePsicologoDto) {}

@Injectable()
export class PsicologosService extends BaseCrudService<PrismaService['psicologo']> {
  constructor(prisma: PrismaService) {
    super(prisma.psicologo, ['nombre', 'especialidad', 'email'], { orderBy: { id: 'asc' } });
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
}

@Module({
  imports: [AuthModule],
  controllers: [PsicologosController],
  providers: [PsicologosService],
})
export class PsicologosModule {}
