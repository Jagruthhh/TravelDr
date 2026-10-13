import { User } from './user.entity';
import { UserRole } from '../common/enums';

/**
 * HelplineAgent entity representing emergency support operators.
 * Manages operator duty availability, supported spoken languages, and concurrent case load.
 */
export class HelplineAgent extends User {
  private spokenLanguages: string[];
  private isAvailableForDuty: boolean;
  private currentActiveCases: number;
  private readonly maxConcurrentCases: number;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    spokenLanguages: string[];
    isAvailableForDuty?: boolean;
    currentActiveCases?: number;
    maxConcurrentCases?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      role: UserRole.HELPLINE_AGENT,
    });

    if (!params.spokenLanguages || params.spokenLanguages.length === 0) {
      throw new Error('HelplineAgent must support at least one language');
    }

    this.spokenLanguages = params.spokenLanguages.map((lang) => lang.trim().toLowerCase());
    this.isAvailableForDuty = params.isAvailableForDuty ?? true;
    this.currentActiveCases = params.currentActiveCases ?? 0;
    this.maxConcurrentCases = params.maxConcurrentCases ?? 5;
  }

  public getSpokenLanguages(): string[] {
    return [...this.spokenLanguages];
  }

  public getIsAvailableForDuty(): boolean {
    return this.isAvailableForDuty && this.isActive;
  }

  public getCurrentActiveCases(): number {
    return this.currentActiveCases;
  }

  public getMaxConcurrentCases(): number {
    return this.maxConcurrentCases;
  }

  public canTakeCase(languageCode?: string): boolean {
    const hasCapacity = this.isAvailableForDuty && this.isActive && this.currentActiveCases < this.maxConcurrentCases;
    if (!hasCapacity) {
      return false;
    }
    if (languageCode) {
      return this.spokenLanguages.includes(languageCode.trim().toLowerCase());
    }
    return true;
  }

  public assignCase(): void {
    if (!this.canTakeCase()) {
      throw new Error(`HelplineAgent ${this.fullName} cannot take more cases`);
    }
    this.currentActiveCases += 1;
    this.touch();
  }

  public releaseCase(): void {
    if (this.currentActiveCases > 0) {
      this.currentActiveCases -= 1;
      this.touch();
    }
  }

  public setDutyStatus(available: boolean): void {
    this.isAvailableForDuty = available;
    this.touch();
  }
}
