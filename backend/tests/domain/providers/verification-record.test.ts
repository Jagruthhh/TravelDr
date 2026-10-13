import { describe, it, expect, beforeEach } from 'vitest';
import { VerificationStatus } from '../../../src/domain/common/enums';
import { VerificationRecord } from '../../../src/domain/providers/verification-record.entity';

describe('VerificationRecord State Transitions', () => {
  const futureExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);

  const createRecord = (status: VerificationStatus = VerificationStatus.PENDING) => {
    return new VerificationRecord({
      id: 'vr-1',
      providerId: 'prov-100',
      licenseDocumentUrl: 'https://docs.fixmyitch.com/licenses/prov-100.pdf',
      status,
      expiresAt: status === VerificationStatus.VERIFIED ? futureExpiry : undefined,
    });
  };

  describe('Initial State', () => {
    it('defaults status to PENDING', () => {
      const record = new VerificationRecord({
        id: 'vr-new',
        providerId: 'prov-100',
        licenseDocumentUrl: 'https://docs.fixmyitch.com/licenses/prov-100.pdf',
      });
      expect(record.getStatus()).toBe(VerificationStatus.PENDING);
      expect(record.isValid()).toBe(false);
    });

    it('validates required fields during construction', () => {
      expect(
        () =>
          new VerificationRecord({
            id: '',
            providerId: 'prov-100',
            licenseDocumentUrl: 'https://doc.pdf',
          }),
      ).toThrow('VerificationRecord ID is required');

      expect(
        () =>
          new VerificationRecord({
            id: 'vr-1',
            providerId: '',
            licenseDocumentUrl: 'https://doc.pdf',
          }),
      ).toThrow('Provider ID is required');

      expect(
        () =>
          new VerificationRecord({
            id: 'vr-1',
            providerId: 'prov-100',
            licenseDocumentUrl: '',
          }),
      ).toThrow('License document URL is required for verification');
    });
  });

  describe('Valid State Transitions', () => {
    it('successfully transitions from PENDING -> VERIFIED via verify()', () => {
      const record = createRecord(VerificationStatus.PENDING);
      record.verify('admin-1', futureExpiry, 'All credentials verified against state medical board');

      expect(record.getStatus()).toBe(VerificationStatus.VERIFIED);
      expect(record.getVerifiedByAdminId()).toBe('admin-1');
      expect(record.getExpiresAt()).toEqual(futureExpiry);
      expect(record.getNotes()).toBe('All credentials verified against state medical board');
      expect(record.isValid()).toBe(true);
    });

    it('successfully transitions from VERIFIED -> SUSPENDED via suspend()', () => {
      const record = createRecord(VerificationStatus.PENDING);
      record.verify('admin-1', futureExpiry);
      expect(record.getStatus()).toBe(VerificationStatus.VERIFIED);

      record.suspend('admin-2', 'License expired or reported under investigation');
      expect(record.getStatus()).toBe(VerificationStatus.SUSPENDED);
      expect(record.getVerifiedByAdminId()).toBe('admin-2');
      expect(record.getNotes()).toBe('License expired or reported under investigation');
      expect(record.isValid()).toBe(false);
    });

    it('successfully transitions from PENDING -> REJECTED via reject()', () => {
      const record = createRecord(VerificationStatus.PENDING);
      record.reject('admin-1', 'Provided medical license could not be validated');

      expect(record.getStatus()).toBe(VerificationStatus.REJECTED);
      expect(record.getVerifiedByAdminId()).toBe('admin-1');
      expect(record.getNotes()).toBe('Provided medical license could not be validated');
      expect(record.isValid()).toBe(false);
    });
  });

  describe('Invalid State Transitions from PENDING', () => {
    it('throws error when attempting to suspend a PENDING record directly', () => {
      const record = createRecord(VerificationStatus.PENDING);
      expect(() => record.suspend('admin-1', 'Suspension reason')).toThrow(
        `Cannot transition from ${VerificationStatus.PENDING} to ${VerificationStatus.SUSPENDED}: provider must be in ${VerificationStatus.VERIFIED} status`,
      );
    });
  });

  describe('Invalid State Transitions from VERIFIED', () => {
    it('throws error when attempting to re-verify an already VERIFIED record', () => {
      const record = createRecord(VerificationStatus.VERIFIED);
      expect(() => record.verify('admin-1', futureExpiry)).toThrow(
        `Cannot transition from ${VerificationStatus.VERIFIED} to ${VerificationStatus.VERIFIED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });

    it('throws error when attempting to reject a VERIFIED record', () => {
      const record = createRecord(VerificationStatus.VERIFIED);
      expect(() => record.reject('admin-1', 'Cannot reject once verified')).toThrow(
        `Cannot transition from ${VerificationStatus.VERIFIED} to ${VerificationStatus.REJECTED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });
  });

  describe('Invalid State Transitions from SUSPENDED', () => {
    it('throws error when attempting to verify a SUSPENDED record directly', () => {
      const record = createRecord(VerificationStatus.SUSPENDED);
      expect(() => record.verify('admin-1', futureExpiry)).toThrow(
        `Cannot transition from ${VerificationStatus.SUSPENDED} to ${VerificationStatus.VERIFIED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });

    it('throws error when attempting to re-suspend an already SUSPENDED record', () => {
      const record = createRecord(VerificationStatus.SUSPENDED);
      expect(() => record.suspend('admin-1', 'Already suspended')).toThrow(
        `Cannot transition from ${VerificationStatus.SUSPENDED} to ${VerificationStatus.SUSPENDED}: provider must be in ${VerificationStatus.VERIFIED} status`,
      );
    });

    it('throws error when attempting to reject a SUSPENDED record', () => {
      const record = createRecord(VerificationStatus.SUSPENDED);
      expect(() => record.reject('admin-1', 'Reject attempt')).toThrow(
        `Cannot transition from ${VerificationStatus.SUSPENDED} to ${VerificationStatus.REJECTED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });
  });

  describe('Invalid State Transitions from REJECTED', () => {
    it('throws error when attempting to verify a REJECTED record', () => {
      const record = createRecord(VerificationStatus.REJECTED);
      expect(() => record.verify('admin-1', futureExpiry)).toThrow(
        `Cannot transition from ${VerificationStatus.REJECTED} to ${VerificationStatus.VERIFIED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });

    it('throws error when attempting to suspend a REJECTED record', () => {
      const record = createRecord(VerificationStatus.REJECTED);
      expect(() => record.suspend('admin-1', 'Suspend attempt')).toThrow(
        `Cannot transition from ${VerificationStatus.REJECTED} to ${VerificationStatus.SUSPENDED}: provider must be in ${VerificationStatus.VERIFIED} status`,
      );
    });

    it('throws error when attempting to re-reject a REJECTED record', () => {
      const record = createRecord(VerificationStatus.REJECTED);
      expect(() => record.reject('admin-1', 'Re-reject attempt')).toThrow(
        `Cannot transition from ${VerificationStatus.REJECTED} to ${VerificationStatus.REJECTED}: provider must be in ${VerificationStatus.PENDING} status`,
      );
    });
  });

  describe('Transition Parameter Validations', () => {
    it('requires adminId and future expiration for verify()', () => {
      const record = createRecord(VerificationStatus.PENDING);
      expect(() => record.verify('', futureExpiry)).toThrow('Admin ID is required to approve verification');
      expect(() => record.verify('admin-1', pastDate)).toThrow('Verification expiration date must be in the future');
    });

    it('requires adminId and reason for reject()', () => {
      const record = createRecord(VerificationStatus.PENDING);
      expect(() => record.reject('', 'reason')).toThrow('Admin ID is required');
      expect(() => record.reject('admin-1', '')).toThrow('Rejection reason is required');
    });

    it('requires adminId and reason for suspend()', () => {
      const record = createRecord(VerificationStatus.VERIFIED);
      expect(() => record.suspend('', 'reason')).toThrow('Admin ID is required');
      expect(() => record.suspend('admin-1', '')).toThrow('Suspension reason is required');
    });
  });
});
