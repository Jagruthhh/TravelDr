import { UserRole } from '../common/enums';

/**
 * Base User domain entity representing an authenticated account.
 * Encapsulates identity, contact information, and role authorization.
 */
export abstract class User {
  protected readonly id: string;
  protected email: string;
  protected fullName: string;
  protected phoneNumber: string;
  protected readonly role: UserRole;
  protected isActive: boolean;
  protected readonly createdAt: Date;
  protected updatedAt: Date;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: UserRole;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    if (!this.isValidEmail(params.email)) {
      throw new Error(`Invalid email address: ${params.email}`);
    }
    if (!params.fullName || params.fullName.trim() === '') {
      throw new Error('User full name cannot be empty');
    }

    this.id = params.id;
    this.email = params.email.trim().toLowerCase();
    this.fullName = params.fullName.trim();
    this.phoneNumber = params.phoneNumber.trim();
    this.role = params.role;
    this.isActive = params.isActive ?? true;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  public getId(): string {
    return this.id;
  }

  public getEmail(): string {
    return this.email;
  }

  public getFullName(): string {
    return this.fullName;
  }

  public getPhoneNumber(): string {
    return this.phoneNumber;
  }

  public getRole(): UserRole {
    return this.role;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public updateProfile(fullName: string, phoneNumber: string): void {
    if (!fullName || fullName.trim() === '') {
      throw new Error('Full name cannot be empty');
    }
    this.fullName = fullName.trim();
    this.phoneNumber = phoneNumber.trim();
    this.touch();
  }

  public deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  public activate(): void {
    this.isActive = true;
    this.touch();
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
