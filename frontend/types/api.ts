/**
 * Domain enumerations matching the TravelDoc / FixMyItch backend.
 */

export enum UserRole {
  TRAVELER = 'TRAVELER',
  HELPLINE_AGENT = 'HELPLINE_AGENT',
  PROVIDER_STAFF = 'PROVIDER_STAFF',
  ADMIN = 'ADMIN',
}

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

export enum HelplineUrgency {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
}

export enum HelplineCasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HelplineCaseStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_ASSISTANCE = 'IN_ASSISTANCE',
  RECOMMENDED = 'RECOMMENDED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// ─── Health Types ─────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  timestamp: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role?: UserRole;
  homeCountry?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export interface UserProfileResponse {
  authenticated: boolean;
  user: JwtUserPayload;
}

export interface RoleCheckResponse {
  message: string;
  user: JwtUserPayload;
}

// ─── Provider Types ───────────────────────────────────────────────────────────

export interface GetProvidersQuery {
  city?: string;
  language?: string;
  specialty?: string;
  verifiedOnly?: boolean;
  treatmentId?: string;
}

export interface GetProviderDetailQuery {
  treatmentId?: string;
}

export interface UpdateProviderVerificationRequest {
  status: VerificationStatus;
  licenseDocumentUrl?: string;
  notes?: string;
  expiresAt?: string;
}

export interface ProviderCostRange {
  hasData: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  label: string;
}

export interface PriceEntryDetail {
  id: string;
  treatmentId: string;
  amount: number;
  currency: string;
  isEstimate: boolean;
  minPrice?: number;
  maxPrice?: number;
  isCurrent: boolean;
  label: string;
}

export interface TreatmentEstimateDetail {
  hasData: boolean;
  treatmentId?: string;
  currency?: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  isRange?: boolean;
  isEstimate?: boolean;
  label?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType | string;
  category: string;
  cityId: string;
  address: string;
  contactNumber: string;
  email: string;
  websiteUrl?: string;
  spokenLanguages: string[];
  specialties: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus | string;
  registrationNumber?: string;
  issuingCouncil?: string;
  lastVerifiedAt?: Date | string;
  verifiedBy?: string;
  verificationNotes?: string;
  verification?: {
    status: VerificationStatus | string;
    registrationNumber?: string;
    issuingCouncil?: string;
    lastVerifiedAt?: Date | string;
    verifiedBy?: string;
    verificationNotes?: string;
    verifiedAt?: Date | string;
    expiresAt?: Date | string;
  };
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  costRange: ProviderCostRange;
  priceEntries?: PriceEntryDetail[];
  treatmentCostEstimate?: TreatmentEstimateDetail;
}

// ─── Case Types ───────────────────────────────────────────────────────────────

export interface CreateCaseRequest {
  id?: string;
  travelerId: string;
  cityId: string;
  subject: string;
  initialDescription: string;
  preferredLanguageCode: string;
  urgency?: HelplineUrgency;
  autoAssign?: boolean;
}

export interface UpdateCaseStatusRequest {
  status: HelplineCaseStatus;
  agentId?: string;
  providerId?: string;
  notes?: string;
  summary?: string;
  urgency?: HelplineUrgency;
}

export interface HelplineCaseResponse {
  id: string;
  travelerId: string;
  cityId: string;
  agentId?: string;
  status: HelplineCaseStatus;
  urgency: HelplineUrgency;
  priority: HelplineCasePriority;
  subject: string;
  initialDescription: string;
  preferredLanguageCode: string;
  recommendedProviderId?: string;
  recommendationNotes?: string;
  resolutionSummary?: string;
  resolvedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}
