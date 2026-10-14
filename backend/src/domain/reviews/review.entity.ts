import { ReviewStatus } from '../common/enums';

/**
 * Review domain entity representing feedback and rating left by a traveler for a healthcare provider.
 * Requires a verified visit (RESOLVED helpline case or COMPLETED appointment).
 * Stored with status PENDING_MODERATION until approved by an administrator.
 */
export class Review {
  private readonly id: string;
  private readonly travelerId: string;
  private readonly providerId: string;
  private readonly appointmentId?: string;
  private readonly caseId?: string;
  private rating: number;
  private comment: string;
  private languageUsed: string;
  private status: ReviewStatus;
  private isVerifiedVisit: boolean;
  private verificationBadge: string;
  private isVerifiedPatient: boolean;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(params: {
    id: string;
    travelerId: string;
    providerId: string;
    rating: number;
    comment: string;
    languageUsed?: string;
    appointmentId?: string;
    caseId?: string;
    status?: ReviewStatus;
    isVerifiedVisit?: boolean;
    verificationBadge?: string;
    isVerifiedPatient?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Review ID is required');
    }
    if (!params.travelerId || params.travelerId.trim() === '') {
      throw new Error('Traveler ID is required');
    }
    if (!params.providerId || params.providerId.trim() === '') {
      throw new Error('Provider ID is required');
    }
    if (params.rating < 1 || params.rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }
    if (!params.comment || params.comment.trim().length < 5) {
      throw new Error('Review comment must be at least 5 characters');
    }
    if (!params.appointmentId && !params.caseId) {
      throw new Error('Review must be linked to a completed appointment or resolved helpline case');
    }

    this.id = params.id.trim();
    this.travelerId = params.travelerId.trim();
    this.providerId = params.providerId.trim();
    this.appointmentId = params.appointmentId?.trim();
    this.caseId = params.caseId?.trim();
    this.rating = params.rating;
    this.comment = params.comment.trim();
    this.languageUsed = (params.languageUsed ?? 'en').trim().toLowerCase();
    this.status = params.status ?? ReviewStatus.PENDING_MODERATION;
    this.isVerifiedVisit = params.isVerifiedVisit ?? true;
    this.verificationBadge = params.verificationBadge?.trim() || 'Verified visit';
    this.isVerifiedPatient = params.isVerifiedPatient ?? true;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  public getId(): string {
    return this.id;
  }

  public getTravelerId(): string {
    return this.travelerId;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getAppointmentId(): string | undefined {
    return this.appointmentId;
  }

  public getCaseId(): string | undefined {
    return this.caseId;
  }

  public getRating(): number {
    return this.rating;
  }

  public getComment(): string {
    return this.comment;
  }

  public getLanguageUsed(): string {
    return this.languageUsed;
  }

  public getStatus(): ReviewStatus {
    return this.status;
  }

  public isApproved(): boolean {
    return this.status === ReviewStatus.APPROVED;
  }

  public isPendingModeration(): boolean {
    return this.status === ReviewStatus.PENDING_MODERATION;
  }

  public isHidden(): boolean {
    return this.status === ReviewStatus.HIDDEN;
  }

  public getIsVerifiedVisit(): boolean {
    return this.isVerifiedVisit;
  }

  public getVerificationBadge(): string {
    return this.verificationBadge;
  }

  public getIsVerifiedPatient(): boolean {
    return this.isVerifiedPatient;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public approve(): void {
    this.status = ReviewStatus.APPROVED;
    this.updatedAt = new Date();
  }

  public hide(): void {
    this.status = ReviewStatus.HIDDEN;
    this.updatedAt = new Date();
  }

  public setStatus(status: ReviewStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }
}
