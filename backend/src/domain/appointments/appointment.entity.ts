import { AppointmentStatus, Currency } from '../common/enums';

/**
 * Appointment domain entity managing consultations between travelers and healthcare providers.
 * Enforces status transitions and tracks language requirements and agreed transparent costs.
 */
export class Appointment {
  private readonly id: string;
  private readonly travelerId: string;
  private readonly providerId: string;
  private readonly treatmentId?: string;
  private scheduledAt: Date;
  private status: AppointmentStatus;
  private agreedPrice: number;
  private currency: Currency;
  private preferredLanguageCode: string;
  private symptomsDescription: string;
  private cancellationReason?: string;
  private completedAt?: Date;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(params: {
    id: string;
    travelerId: string;
    providerId: string;
    scheduledAt: Date;
    agreedPrice: number;
    currency: Currency;
    preferredLanguageCode: string;
    symptomsDescription: string;
    treatmentId?: string;
    status?: AppointmentStatus;
    cancellationReason?: string;
    completedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Appointment ID is required');
    }
    if (!params.travelerId || params.travelerId.trim() === '') {
      throw new Error('Traveler ID is required');
    }
    if (!params.providerId || params.providerId.trim() === '') {
      throw new Error('Provider ID is required');
    }
    if (params.agreedPrice < 0) {
      throw new Error('Agreed appointment cost cannot be negative');
    }

    this.id = params.id.trim();
    this.travelerId = params.travelerId.trim();
    this.providerId = params.providerId.trim();
    this.treatmentId = params.treatmentId?.trim();
    this.scheduledAt = params.scheduledAt;
    this.status = params.status ?? AppointmentStatus.REQUESTED;
    this.agreedPrice = params.agreedPrice;
    this.currency = params.currency;
    this.preferredLanguageCode = params.preferredLanguageCode.trim().toLowerCase();
    this.symptomsDescription = params.symptomsDescription.trim();
    this.cancellationReason = params.cancellationReason;
    this.completedAt = params.completedAt;
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

  public getTreatmentId(): string | undefined {
    return this.treatmentId;
  }

  public getScheduledAt(): Date {
    return this.scheduledAt;
  }

  public getStatus(): AppointmentStatus {
    return this.status;
  }

  public getAgreedPrice(): number {
    return this.agreedPrice;
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public getPreferredLanguageCode(): string {
    return this.preferredLanguageCode;
  }

  public getSymptomsDescription(): string {
    return this.symptomsDescription;
  }

  public getCancellationReason(): string | undefined {
    return this.cancellationReason;
  }

  public getCompletedAt(): Date | undefined {
    return this.completedAt;
  }

  public confirm(): void {
    if (this.status !== AppointmentStatus.REQUESTED) {
      throw new Error(`Cannot confirm appointment in state: ${this.status}`);
    }
    this.status = AppointmentStatus.CONFIRMED;
    this.touch();
  }

  public startConsultation(): void {
    if (this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error(`Cannot start consultation in state: ${this.status}`);
    }
    this.status = AppointmentStatus.IN_PROGRESS;
    this.touch();
  }

  public complete(): void {
    if (this.status !== AppointmentStatus.IN_PROGRESS && this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error(`Cannot complete appointment in state: ${this.status}`);
    }
    this.status = AppointmentStatus.COMPLETED;
    this.completedAt = new Date();
    this.touch();
  }

  public cancel(reason: string): void {
    if (this.status === AppointmentStatus.COMPLETED || this.status === AppointmentStatus.CANCELLED) {
      throw new Error(`Appointment cannot be cancelled once in state: ${this.status}`);
    }
    if (!reason || reason.trim() === '') {
      throw new Error('Cancellation reason is required');
    }
    this.status = AppointmentStatus.CANCELLED;
    this.cancellationReason = reason.trim();
    this.touch();
  }

  public reschedule(newTime: Date): void {
    if (this.status === AppointmentStatus.COMPLETED || this.status === AppointmentStatus.CANCELLED) {
      throw new Error('Cannot reschedule an already finalized appointment');
    }
    if (newTime.getTime() <= Date.now()) {
      throw new Error('New appointment date must be in the future');
    }
    this.scheduledAt = newTime;
    this.status = AppointmentStatus.REQUESTED;
    this.touch();
  }

  public isUpcoming(): boolean {
    return (
      (this.status === AppointmentStatus.REQUESTED || this.status === AppointmentStatus.CONFIRMED) &&
      this.scheduledAt.getTime() > Date.now()
    );
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
