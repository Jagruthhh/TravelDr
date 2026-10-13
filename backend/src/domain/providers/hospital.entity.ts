import { HealthcareProvider } from './healthcare-provider.entity';
import { ProviderType } from '../common/enums';
import { VerificationRecord } from './verification-record.entity';
import { PriceEntry } from './price-entry.entity';

/**
 * Hospital domain entity representing full-scale inpatient and emergency healthcare facilities.
 */
export class Hospital extends HealthcareProvider {
  private emergencyDepartment24x7: boolean;
  private totalInpatientBeds: number;
  private traumaLevel?: string;
  private ambulanceServiceAvailable: boolean;

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
    emergencyDepartment24x7?: boolean;
    totalInpatientBeds?: number;
    traumaLevel?: string;
    ambulanceServiceAvailable?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      type: ProviderType.HOSPITAL,
    });

    this.emergencyDepartment24x7 = params.emergencyDepartment24x7 ?? true;
    this.totalInpatientBeds = params.totalInpatientBeds ?? 50;
    this.traumaLevel = params.traumaLevel;
    this.ambulanceServiceAvailable = params.ambulanceServiceAvailable ?? true;
  }

  public getEmergencyDepartment24x7(): boolean {
    return this.emergencyDepartment24x7;
  }

  public getTotalInpatientBeds(): number {
    return this.totalInpatientBeds;
  }

  public getTraumaLevel(): string | undefined {
    return this.traumaLevel;
  }

  public getAmbulanceServiceAvailable(): boolean {
    return this.ambulanceServiceAvailable;
  }

  public hasEmergencyServices(): boolean {
    return this.emergencyDepartment24x7 && this.isActive;
  }

  public getProviderCategory(): string {
    return 'Hospital';
  }
}
