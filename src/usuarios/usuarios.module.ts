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
import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class CreateUsuarioDto {
  @IsString() nombre: string;
  @IsEmail() email: string;
  @IsString() @MinLength(4) password: string;
  @Type(() => Number) @IsInt() roleId: number;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() title?: string;
}
class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}

const SELECT = {
  id: true, nombre: true, email: true, title: true, estado: true,
  roleId: true, createdAt: true, role: true,
};

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;
    return this.prisma.user.findMany({ where, orderBy: { id: 'desc' }, select: SELECT });
  }

  async findOne(id: number) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: SELECT });
    if (!u) throw new NotFoundException(`Usuario #${id} no encontrado`);
    return u;
  }

  async create(dto: CreateUsuarioDto) {
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, email: dto.email.trim().toLowerCase(), password },
      select: SELECT,
    });
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.email) data.email = dto.email.trim().toLowerCase();
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({ where: { id }, data, select: SELECT });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { id, deleted: true };
  }
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @UseGuards(JwtAuthGuard) @Get() findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }
  @UseGuards(JwtAuthGuard) @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
  @UseGuards(JwtAuthGuard) @Post() create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }
  @UseGuards(JwtAuthGuard) @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.service.update(id, dto);
  }
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
