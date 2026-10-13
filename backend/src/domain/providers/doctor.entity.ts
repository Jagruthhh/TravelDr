import { HealthcareProvider } from './healthcare-provider.entity';
import { ProviderType } from '../common/enums';
import { VerificationRecord } from './verification-record.entity';
import { PriceEntry } from './price-entry.entity';

/**
 * Doctor domain entity representing verified individual medical practitioners.
 */
export class Doctor extends HealthcareProvider {
  private readonly medicalLicenseNumber: string;
  private yearsOfExperience: number;
  private professionalTitle: string;
  private affiliatedFacilityId?: string;
  private acceptsEmergencyCalls: boolean;
  /** The Hospital or Clinic this doctor is directly attached to, if any. */
  private parentProvider?: HealthcareProvider;

  constructor(params: {
    id: string;
    name: string;
    cityId: string;
    address: string;
    contactNumber: string;
    email: string;
    medicalLicenseNumber: string;
    yearsOfExperience?: number;
    professionalTitle?: string;
    affiliatedFacilityId?: string;
    acceptsEmergencyCalls?: boolean;
    /** Typed parent provider (Hospital or Clinic) this doctor belongs to. */
    parentProvider?: HealthcareProvider;
    websiteUrl?: string;
    spokenLanguageCodes?: string[];
    specialtyIds?: string[];
    verificationRecord?: VerificationRecord;
    priceEntries?: PriceEntry[];
    averageRating?: number;
    totalReviews?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      type: ProviderType.DOCTOR,
    });

    if (!params.medicalLicenseNumber || params.medicalLicenseNumber.trim() === '') {
      throw new Error('Medical license number is required for doctor entity');
    }

    this.medicalLicenseNumber = params.medicalLicenseNumber.trim();
    this.yearsOfExperience = params.yearsOfExperience ?? 0;
    this.professionalTitle = params.professionalTitle?.trim() ?? 'Dr.';
    this.affiliatedFacilityId = params.affiliatedFacilityId?.trim();
    this.acceptsEmergencyCalls = params.acceptsEmergencyCalls ?? false;
    this.parentProvider = params.parentProvider;
  }

  public getMedicalLicenseNumber(): string {
    return this.medicalLicenseNumber;
  }

  public getYearsOfExperience(): number {
    return this.yearsOfExperience;
  }

  public getProfessionalTitle(): string {
    return this.professionalTitle;
  }

  public getAffiliatedFacilityId(): string | undefined {
    return this.affiliatedFacilityId;
  }

  public getAcceptsEmergencyCalls(): boolean {
    return this.acceptsEmergencyCalls;
  }

  public getDisplayName(): string {
    return `${this.professionalTitle} ${this.name}`;
  }

  public hasFacilityAffiliation(): boolean {
    return !!this.affiliatedFacilityId;
  }

  /** Returns the typed parent provider (Hospital or Clinic) this doctor belongs to. */
  public getParentProvider(): HealthcareProvider | undefined {
    return this.parentProvider;
  }

  /** Attaches or replaces the parent provider for this doctor. */
  public setParentProvider(provider: HealthcareProvider): void {
    this.parentProvider = provider;
    this.touch();
  }

  public getProviderCategory(): string {
    return 'Doctor';
  }
}
