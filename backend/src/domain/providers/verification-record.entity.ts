import { VerificationStatus } from '../common/enums';

/**
 * VerificationRecord domain entity encapsulating medical credential verification,
 * compliance audits, and admin sign-off for healthcare providers.
 */
export class VerificationRecord {
  private readonly id: string;
  private readonly providerId: string;
  private status: VerificationStatus;
  private verifiedByAdminId?: string;
  private licenseDocumentUrl: string;
  private notes: string;
  private verifiedAt?: Date;
  private expiresAt?: Date;

  constructor(params: {
    id: string;
    providerId: string;
    licenseDocumentUrl: string;
    status?: VerificationStatus;
    verifiedByAdminId?: string;
    notes?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('VerificationRecord ID is required');
    }
    if (!params.providerId || params.providerId.trim() === '') {
      throw new Error('Provider ID is required');
    }
    if (!params.licenseDocumentUrl || params.licenseDocumentUrl.trim() === '') {
      throw new Error('License document URL is required for verification');
    }

    this.id = params.id.trim();
    this.providerId = params.providerId.trim();
    this.licenseDocumentUrl = params.licenseDocumentUrl.trim();
    this.status = params.status ?? VerificationStatus.PENDING;
    this.verifiedByAdminId = params.verifiedByAdminId;
    this.notes = params.notes?.trim() ?? '';
    this.verifiedAt = params.verifiedAt;
    this.expiresAt = params.expiresAt;
  }

  public getId(): string {
    return this.id;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getStatus(): VerificationStatus {
    return this.status;
  }

  public getVerifiedByAdminId(): string | undefined {
    return this.verifiedByAdminId;
  }

  public getLicenseDocumentUrl(): string {
    return this.licenseDocumentUrl;
  }

  public getNotes(): string {
    return this.notes;
  }

  public getVerifiedAt(): Date | undefined {
    return this.verifiedAt;
  }

  public getExpiresAt(): Date | undefined {
    return this.expiresAt;
  }

  public verify(adminId: string, expiresAt: Date, notes?: string): void {
    if (this.status !== VerificationStatus.PENDING) {
      throw new Error(`Cannot transition from ${this.status} to ${VerificationStatus.VERIFIED}: provider must be in ${VerificationStatus.PENDING} status`);
    }
    if (!adminId || adminId.trim() === '') {
      throw new Error('Admin ID is required to approve verification');
    }
    if (expiresAt <= new Date()) {
      throw new Error('Verification expiration date must be in the future');
    }
    this.status = VerificationStatus.VERIFIED;
    this.verifiedByAdminId = adminId.trim();
    this.verifiedAt = new Date();
    this.expiresAt = expiresAt;
    if (notes) {
      this.notes = notes.trim();
    }
  }

  public reject(adminId: string, reason: string): void {
    if (this.status !== VerificationStatus.PENDING) {
      throw new Error(`Cannot transition from ${this.status} to ${VerificationStatus.REJECTED}: provider must be in ${VerificationStatus.PENDING} status`);
    }
    if (!adminId || adminId.trim() === '') {
      throw new Error('Admin ID is required');
    }
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required');
    }
    this.status = VerificationStatus.REJECTED;
    this.verifiedByAdminId = adminId.trim();
    this.notes = reason.trim();
  }

  public suspend(adminId: string, reason: string): void {
    if (this.status !== VerificationStatus.VERIFIED) {
      throw new Error(`Cannot transition from ${this.status} to ${VerificationStatus.SUSPENDED}: provider must be in ${VerificationStatus.VERIFIED} status`);
    }
    if (!adminId || adminId.trim() === '') {
      throw new Error('Admin ID is required');
    }
    if (!reason || reason.trim() === '') {
      throw new Error('Suspension reason is required');
    }
    this.status = VerificationStatus.SUSPENDED;
    this.verifiedByAdminId = adminId.trim();
    this.notes = reason.trim();
  }

  public isValid(): boolean {
    if (this.status !== VerificationStatus.VERIFIED) {
      return false;
    }
    if (!this.expiresAt) {
      return true;
    }
    return this.expiresAt.getTime() > Date.now();
  }
}
