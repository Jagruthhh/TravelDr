import { HealthcareProvider } from './healthcare-provider.entity';
import { ProviderType } from '../common/enums';
import { VerificationRecord } from './verification-record.entity';
import { PriceEntry } from './price-entry.entity';

/**
 * Clinic domain entity representing outpatient medical clinics and centers.
 */
export class Clinic extends HealthcareProvider {
  private allowsWalkIns: boolean;
  private appointmentRequired: boolean;
  private operatingHoursDescription: string;
  private offersTelehealth: boolean;

  constructor(params: {
    id: string;
    name: string;
    cityId: string;
    address: string;
    contactNumber: string;
    email: string;
    websiteUrl?: string;
    spokenLanguageCodes?: string[];
    specialtyIds?: string[];
    verificationRecord?: VerificationRecord;
    priceEntries?: PriceEntry[];
    averageRating?: number;
    totalReviews?: number;
    allowsWalkIns?: boolean;
    appointmentRequired?: boolean;
    operatingHoursDescription?: string;
    offersTelehealth?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      type: ProviderType.CLINIC,
    });

    this.allowsWalkIns = params.allowsWalkIns ?? true;
    this.appointmentRequired = params.appointmentRequired ?? false;
    this.operatingHoursDescription = params.operatingHoursDescription?.trim() ?? '09:00 - 18:00';
    this.offersTelehealth = params.offersTelehealth ?? false;
  }

  public getAllowsWalkIns(): boolean {
    return this.allowsWalkIns;
  }

  public getAppointmentRequired(): boolean {
    return this.appointmentRequired;
  }

  public getOperatingHoursDescription(): string {
    return this.operatingHoursDescription;
  }

  public getOffersTelehealth(): boolean {
    return this.offersTelehealth;
  }

  public acceptsWalkInTravelers(): boolean {
    return this.allowsWalkIns && this.isActive;
  }

  public getProviderCategory(): string {
    return 'Clinic';
  }
}
