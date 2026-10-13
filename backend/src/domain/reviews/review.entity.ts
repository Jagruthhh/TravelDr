/**
 * Review domain entity representing feedback and rating left by a traveler for a healthcare provider.
 */
export class Review {
  private readonly id: string;
  private readonly travelerId: string;
  private readonly providerId: string;
  private readonly appointmentId?: string;
  private rating: number;
  private comment: string;
  private languageUsed: string;
  private isVerifiedPatient: boolean;
  private readonly createdAt: Date;

  constructor(params: {
    id: string;
    travelerId: string;
    providerId: string;
    rating: number;
    comment: string;
    languageUsed: string;
    appointmentId?: string;
    isVerifiedPatient?: boolean;
    createdAt?: Date;
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

    this.id = params.id.trim();
    this.travelerId = params.travelerId.trim();
    this.providerId = params.providerId.trim();
    this.appointmentId = params.appointmentId?.trim();
    this.rating = params.rating;
    this.comment = params.comment.trim();
    this.languageUsed = params.languageUsed.trim().toLowerCase();
    this.isVerifiedPatient = params.isVerifiedPatient ?? !!params.appointmentId;
    this.createdAt = params.createdAt ?? new Date();
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

  public getRating(): number {
    return this.rating;
  }

  public getComment(): string {
    return this.comment;
  }

  public getLanguageUsed(): string {
    return this.languageUsed;
  }

  public getIsVerifiedPatient(): boolean {
    return this.isVerifiedPatient;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }
}
