import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../../domain';
import { AuthResponse, JwtPayload, LoginDto, RegisterDto } from './auth.dto';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Service managing user registration, credential validation, and JWT token issuance.
 */
@Injectable()
export class AuthService {
  private readonly users: Map<string, StoredUser> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Registers a new user account with hashed password and returns an auth token.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (!dto.email || !this.isValidEmail(dto.email)) {
      throw new BadRequestException('A valid email address is required');
    }

    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    if (!dto.fullName || dto.fullName.trim() === '') {
      throw new BadRequestException('Full name is required');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    if (this.users.has(normalizedEmail)) {
      throw new ConflictException(
        `User with email "${normalizedEmail}" is already registered`,
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const role = dto.role ?? UserRole.TRAVELER;

    const user: StoredUser = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      phoneNumber: dto.phoneNumber?.trim() ?? '',
      role,
      isActive: true,
      createdAt: new Date(),
    };

    this.users.set(normalizedEmail, user);

    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Authenticates user credentials and returns a signed JWT.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = this.users.get(normalizedEmail);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Finds a user by email.
   */
  async findByEmail(email: string): Promise<StoredUser | null> {
    return this.users.get(email.trim().toLowerCase()) || null;
  }

  /**
   * Clears in-memory users (useful for test isolation).
   */
  clearUsers(): void {
    this.users.clear();
  }

  private async generateToken(user: StoredUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}
