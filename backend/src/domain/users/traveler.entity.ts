import { User } from './user.entity';
import { UserRole } from '../common/enums';

export interface EmergencyContact {
  fullName: string;
  phoneNumber: string;
  relationship: string;
}

/**
 * Traveler domain entity representing an international traveler seeking medical care.
 * Encapsulates preferred languages for doctor matching and emergency contact details.
 */
export class Traveler extends User {
  private homeCountry: string;
  private preferredLanguageCodes: string[];
  private emergencyContact?: EmergencyContact;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    homeCountry: string;
    preferredLanguageCodes?: string[];
    emergencyContact?: EmergencyContact;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      role: UserRole.TRAVELER,
    });

    if (!params.homeCountry || params.homeCountry.trim() === '') {
      throw new Error('Home country is required for travelers');
    }

    this.homeCountry = params.homeCountry.trim();
    this.preferredLanguageCodes = params.preferredLanguageCodes ?? ['en'];
    this.emergencyContact = params.emergencyContact;
  }

  public getHomeCountry(): string {
    return this.homeCountry;
  }

  public getPreferredLanguageCodes(): string[] {
    return [...this.preferredLanguageCodes];
  }

  public getEmergencyContact(): EmergencyContact | undefined {
    return this.emergencyContact ? { ...this.emergencyContact } : undefined;
  }

  public addPreferredLanguage(languageCode: string): void {
    const normalized = languageCode.trim().toLowerCase();
    if (!this.preferredLanguageCodes.includes(normalized)) {
      this.preferredLanguageCodes.push(normalized);
      this.touch();
    }
  }

  public removePreferredLanguage(languageCode: string): void {
    const normalized = languageCode.trim().toLowerCase();
    if (this.preferredLanguageCodes.length <= 1) {
      throw new Error('Traveler must retain at least one preferred language');
    }
    this.preferredLanguageCodes = this.preferredLanguageCodes.filter((code) => code !== normalized);
    this.touch();
  }

  public updateEmergencyContact(contact: EmergencyContact): void {
    if (!contact.fullName || !contact.phoneNumber) {
      throw new Error('Emergency contact name and phone number are required');
    }
    this.emergencyContact = { ...contact };
    this.touch();
  }

  public speaksLanguage(languageCode: string): boolean {
    return this.preferredLanguageCodes.includes(languageCode.trim().toLowerCase());
  }
}
