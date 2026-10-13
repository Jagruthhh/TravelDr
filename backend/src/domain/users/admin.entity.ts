import { User } from './user.entity';
import { UserRole } from '../common/enums';

/**
 * Admin entity representing platform administrators responsible for verification,
 * dispute resolution, catalog maintenance, and helpline governance.
 */
export class Admin extends User {
  private department: string;
  private permissions: Set<string>;
  private isSuperAdmin: boolean;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    department: string;
    permissions?: string[];
    isSuperAdmin?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      role: UserRole.ADMIN,
    });

    if (!params.department || params.department.trim() === '') {
      throw new Error('Department is required for admin');
    }

    this.department = params.department.trim();
    this.permissions = new Set(params.permissions ?? ['VERIFY_PROVIDERS', 'MANAGE_CATALOG']);
    this.isSuperAdmin = params.isSuperAdmin ?? false;
  }

  public getDepartment(): string {
    return this.department;
  }

  public getPermissions(): string[] {
    return Array.from(this.permissions);
  }

  public getIsSuperAdmin(): boolean {
    return this.isSuperAdmin;
  }

  public hasPermission(permission: string): boolean {
    if (this.isSuperAdmin) {
      return true;
    }
    return this.permissions.has(permission);
  }

  public grantPermission(permission: string): void {
    this.permissions.add(permission);
    this.touch();
  }

  public revokePermission(permission: string): void {
    this.permissions.delete(permission);
    this.touch();
  }
}
