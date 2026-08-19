import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Patch,
  Post,
  Body,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

class LoginDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

class ChangePasswordDto {
  @IsString()
  actual: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  nueva: string;
}

class UpdatePerfilDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() licencia?: string;
}

// Guard JWT hecho a mano (sin Passport), como en el molde de intimas.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token');
    }
    const token = auth.slice(7);
    try {
      const payload = await this.jwt.verifyAsync(token);
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sanitize(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const access_token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    });
    return { access_token, user: this.sanitize(user) };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, psicologo: true },
    });
    if (!user) throw new UnauthorizedException();
    const clean = this.sanitize(user);
    // Expone la licencia del psicólogo enlazado a nivel de usuario.
    return { ...clean, licencia: user.psicologo?.licencia ?? null };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.actual, user.password))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    const password = await bcrypt.hash(dto.nueva, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password } });
    return { ok: true };
  }

  async updatePerfil(userId: number, dto: UpdatePerfilDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (dto.nombre !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { nombre: dto.nombre } });
    }
    // La licencia vive en la ficha de psicólogo enlazada (si existe).
    if (dto.licencia !== undefined && user.psicologoId) {
      await this.prisma.psicologo.update({
        where: { id: user.psicologoId },
        data: { licencia: dto.licencia },
      });
    }
    return this.me(userId);
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return this.service.me((req as any).user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  perfil(@Req() req: Request) {
    return this.service.me((req as any).user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  updatePerfil(@Req() req: Request, @Body() dto: UpdatePerfilDto) {
    return this.service.updatePerfil((req as any).user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword((req as any).user.sub, dto);
  }
}

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'serycrecer-dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
