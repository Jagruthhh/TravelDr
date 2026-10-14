import { Review, ReviewStatus } from '../domain';

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

export interface ReviewFilter {
  providerId?: string;
  travelerId?: string;
  status?: ReviewStatus;
  caseId?: string;
  appointmentId?: string;
}

export interface ReviewRepository {
  findById(id: string): Promise<Review | null>;
  findAll(filter?: ReviewFilter): Promise<Review[]>;
  findByProviderId(providerId: string, status?: ReviewStatus): Promise<Review[]>;
  findByAppointmentId(appointmentId: string): Promise<Review | null>;
  findByCaseId(caseId: string): Promise<Review | null>;
  save(review: Review): Promise<void>;
  delete(id: string): Promise<void>;
  count(filter?: ReviewFilter): Promise<number>;
}
