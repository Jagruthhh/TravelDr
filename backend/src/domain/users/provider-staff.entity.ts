import { User } from './user.entity';
import { UserRole } from '../common/enums';

/**
 * ProviderStaff entity representing administrative and operational staff
 * affiliated with a hospital, clinic, or private practice.
 */
export class ProviderStaff extends User {
  private providerId: string;
  private facilityRole: string;
  private isPrimaryContact: boolean;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    providerId: string;
    facilityRole: string;
    isPrimaryContact?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      role: UserRole.PROVIDER_STAFF,
    });

    if (!params.providerId || params.providerId.trim() === '') {
      throw new Error('Provider ID is required for provider staff');
    }
    if (!params.facilityRole || params.facilityRole.trim() === '') {
      throw new Error('Facility role is required');
    }

    this.providerId = params.providerId.trim();
    this.facilityRole = params.facilityRole.trim();
    this.isPrimaryContact = params.isPrimaryContact ?? false;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getFacilityRole(): string {
    return this.facilityRole;
  }

  public getIsPrimaryContact(): boolean {
    return this.isPrimaryContact;
  }

  public updateRole(newRole: string): void {
    if (!newRole || newRole.trim() === '') {
      throw new Error('Facility role cannot be empty');
    }
    this.facilityRole = newRole.trim();
    this.touch();
  }

  public setPrimaryContact(isPrimary: boolean): void {
    this.isPrimaryContact = isPrimary;
    this.touch();
  }
}
