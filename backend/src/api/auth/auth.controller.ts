import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse, LoginDto, RegisterDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../../domain';

/**
 * Controller handling user authentication, session verification,
 * and role-guarded endpoints.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public route: Register a new account.
   */
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  /**
   * Public route: Authenticate existing account.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * Protected route: Returns the authenticated user profile.
   * Rejects request without a token (401 Unauthorized).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return {
      authenticated: true,
      user: req.user,
    };
  }

  /**
   * Protected route: Accessible only by ADMIN users.
   * Rejects request without token (401) or without ADMIN role (403).
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminArea(@Req() req: any) {
    return {
      message: 'Admin authorization granted',
      user: req.user,
    };
  }

  /**
   * Protected route: Accessible by HELPLINE_AGENT or ADMIN users.
   */
  @Get('agent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HELPLINE_AGENT, UserRole.ADMIN)
  async getAgentArea(@Req() req: any) {
    return {
      message: 'Helpline agent authorization granted',
      user: req.user,
    };
  }

  /**
   * Protected route: Accessible by PROVIDER_STAFF or ADMIN users.
   */
  @Get('provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER_STAFF, UserRole.ADMIN)
  async getProviderArea(@Req() req: any) {
    return {
      message: 'Provider staff authorization granted',
      user: req.user,
    };
  }
}
