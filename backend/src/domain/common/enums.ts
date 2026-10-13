/**
 * Domain enumerations defining system-wide constants and statuses.
 */

export enum UserRole {
  TRAVELER = 'TRAVELER',
  HELPLINE_AGENT = 'HELPLINE_AGENT',
  PROVIDER_STAFF = 'PROVIDER_STAFF',
  ADMIN = 'ADMIN',
}

/**
 * Role enum alias mapping directly to UserRole.
 */
export const Role = UserRole;
export type Role = UserRole;

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum ProviderType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  DOCTOR = 'DOCTOR',
}

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum HelplineUrgency {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
}

/** Urgency alias */
export const Urgency = HelplineUrgency;
export type Urgency = HelplineUrgency;

export enum HelplineCasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HelplineCaseStatus {
  NEW = 'NEW',
  OPEN = 'NEW', // Backwards compatibility alias
  ASSIGNED = 'ASSIGNED',
  RECOMMENDED = 'RECOMMENDED',
  IN_ASSISTANCE = 'IN_ASSISTANCE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  INR = 'INR',
  THB = 'THB',
}
