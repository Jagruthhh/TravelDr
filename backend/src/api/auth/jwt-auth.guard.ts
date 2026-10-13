import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './auth.dto';

/**
 * Guard verifying incoming Bearer JWT tokens in Authorization headers.
 * Throws UnauthorizedException (401) when token is missing, malformed, or expired.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader || authHeader.trim() === '') {
      throw new UnauthorizedException('Authorization token is required');
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
      throw new UnauthorizedException(
        'Invalid authorization header format (Bearer <token> required)',
      );
    }

    const token = parts[1];

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authorization token');
    }
  }
}
