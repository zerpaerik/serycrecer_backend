import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule, JwtAuthGuard } from '../auth/auth.module';

class UpdateConfigDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() ruc?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() horario?: string;
  @IsOptional() @IsString() moneda?: string;
}

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.config.findUnique({ where: { id: 1 } });
    return existing ?? this.prisma.config.create({ data: { id: 1 } });
  }

  async update(dto: UpdateConfigDto) {
    await this.get();
    return this.prisma.config.update({ where: { id: 1 }, data: dto });
  }
}

@Controller('config')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  @Get() get() {
    return this.service.get();
  }
  @UseGuards(JwtAuthGuard) @Patch() update(@Body() dto: UpdateConfigDto) {
    return this.service.update(dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigAppModule {}
