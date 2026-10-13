import { ProviderType, VerificationStatus } from '../common/enums';
import { VerificationRecord } from './verification-record.entity';
import { PriceEntry } from './price-entry.entity';

/**
 * Abstract HealthcareProvider domain entity.
 * Serves as the base polymorphic class for Hospital, Clinic, and Doctor.
 * Implements core language compatibility checks, verification validation,
 * transparent pricing lookups, and rating computations.
 */
export abstract class HealthcareProvider {
  protected readonly id: string;
  protected name: string;
  protected readonly type: ProviderType;
  protected cityId: string;
  protected address: string;
  protected contactNumber: string;
  protected email: string;
  protected websiteUrl?: string;
  protected spokenLanguageCodes: Set<string>;
  protected specialtyIds: Set<string>;
  protected verificationRecord?: VerificationRecord;
  protected priceEntries: PriceEntry[];
  protected averageRating: number;
  protected totalReviews: number;
  protected isActive: boolean;
  protected readonly createdAt: Date;
  protected updatedAt: Date;

  constructor(params: {
    id: string;
    name: string;
    type: ProviderType;
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
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Provider ID is required');
    }
    if (!params.name || params.name.trim() === '') {
      throw new Error('Provider name is required');
    }
    if (!params.cityId || params.cityId.trim() === '') {
      throw new Error('Provider city ID is required');
    }
    if (!params.address || params.address.trim() === '') {
      throw new Error('Provider address is required');
    }

    this.id = params.id.trim();
    this.name = params.name.trim();
    this.type = params.type;
    this.cityId = params.cityId.trim();
    this.address = params.address.trim();
    this.contactNumber = params.contactNumber.trim();
    this.email = params.email.trim().toLowerCase();
    this.websiteUrl = params.websiteUrl?.trim();
    this.spokenLanguageCodes = new Set(
      (params.spokenLanguageCodes ?? ['en']).map((l) => l.trim().toLowerCase()),
    );
    this.specialtyIds = new Set(params.specialtyIds ?? []);
    this.verificationRecord = params.verificationRecord;
    this.priceEntries = params.priceEntries ?? [];
    this.averageRating = params.averageRating ?? 0;
    this.totalReviews = params.totalReviews ?? 0;
    this.isActive = params.isActive ?? true;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): ProviderType {
    return this.type;
  }

  public getCityId(): string {
    return this.cityId;
  }

  public getAddress(): string {
    return this.address;
  }

  public getContactNumber(): string {
    return this.contactNumber;
  }

  public getEmail(): string {
    return this.email;
  }

  public getWebsiteUrl(): string | undefined {
    return this.websiteUrl;
  }

  public getSpokenLanguageCodes(): string[] {
    return Array.from(this.spokenLanguageCodes);
  }

  public getSpecialtyIds(): string[] {
    return Array.from(this.specialtyIds);
  }

  public getVerificationRecord(): VerificationRecord | undefined {
    return this.verificationRecord;
  }

  public getPriceEntries(): PriceEntry[] {
    return [...this.priceEntries];
  }

  public getAverageRating(): number {
    return this.averageRating;
  }

  public getTotalReviews(): number {
    return this.totalReviews;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Evaluates if this provider can consult in any of the traveler's preferred languages.
   */
  public isLanguageCompatible(travelerLanguages: string[]): boolean {
    if (!travelerLanguages || travelerLanguages.length === 0) {
      return false;
    }
    return travelerLanguages.some((lang) =>
      this.spokenLanguageCodes.has(lang.trim().toLowerCase()),
    );
  }

  /**
   * Returns true when this provider speaks the given language code (e.g. 'en', 'hi').
   * Single-language convenience variant of isLanguageCompatible.
   */
  public supportsLanguage(lang: string): boolean {
    if (!lang || lang.trim() === '') {
      return false;
    }
    return this.spokenLanguageCodes.has(lang.trim().toLowerCase());
  }

  /**
   * Returns the current VerificationStatus enum value, or PENDING when no
   * verification record has been attached yet.
   */
  public getVerificationStatus(): VerificationStatus {
    return this.verificationRecord?.getStatus() ?? VerificationStatus.PENDING;
  }

  /**
   * Determines if the provider has an active, valid credential verification record.
   */
  public isVerified(): boolean {
    return !!this.verificationRecord && this.verificationRecord.isValid();
  }

  public attachVerificationRecord(record: VerificationRecord): void {
    if (record.getProviderId() !== this.id) {
      throw new Error('Verification record belongs to a different provider');
    }
    this.verificationRecord = record;
    this.touch();
  }

  public addSpokenLanguage(languageCode: string): void {
    this.spokenLanguageCodes.add(languageCode.trim().toLowerCase());
    this.touch();
  }

  public addSpecialty(specialtyId: string): void {
    this.specialtyIds.add(specialtyId.trim());
    this.touch();
  }

  public addPriceEntry(entry: PriceEntry): void {
    if (entry.getProviderId() !== this.id) {
      throw new Error('Price entry belongs to a different provider');
    }
    this.priceEntries.push(entry);
    this.touch();
  }

  public getPriceForTreatment(treatmentId: string): PriceEntry | undefined {
    return this.priceEntries
      .filter((p) => p.getTreatmentId() === treatmentId && p.isCurrent())
      .sort((a, b) => b.getEffectiveFrom().getTime() - a.getEffectiveFrom().getTime())[0];
  }

  public recordReview(newRating: number): void {
    if (newRating < 1 || newRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    const currentSum = this.averageRating * this.totalReviews;
    this.totalReviews += 1;
    this.averageRating = Math.round(((currentSum + newRating) / this.totalReviews) * 10) / 10;
    this.touch();
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }

  public abstract getProviderCategory(): string;
}
