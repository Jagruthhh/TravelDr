import { describe, it, expect } from 'vitest';
import {
  Role,
  UserRole,
  HelplineCaseStatus,
  HelplineUrgency,
  Urgency,
  HelplineCasePriority,
} from '../../../src/domain/common/enums';
import {
  User,
  Traveler,
  HelplineAgent,
  ProviderStaff,
  Admin,
} from '../../../src/domain';
import { HelplineCase } from '../../../src/domain/helpline/helpline-case.entity';

describe('User Hierarchy & Role Enum', () => {
  it('exports Role enum that aliases UserRole', () => {
    expect(Role.TRAVELER).toBe(UserRole.TRAVELER);
    expect(Role.HELPLINE_AGENT).toBe(UserRole.HELPLINE_AGENT);
    expect(Role.PROVIDER_STAFF).toBe(UserRole.PROVIDER_STAFF);
    expect(Role.ADMIN).toBe(UserRole.ADMIN);
  });

  it('creates Traveler with TRAVELER role', () => {
    const traveler = new Traveler({
      id: 'trav-1',
      email: 'traveler@fixmyitch.com',
      fullName: 'Alex Traveler',
      phoneNumber: '+1234567890',
      homeCountry: 'USA',
    });

    expect(traveler).toBeInstanceOf(User);
    expect(traveler.getRole()).toBe(Role.TRAVELER);
    expect(traveler.getHomeCountry()).toBe('USA');
  });

  it('creates HelplineAgent with HELPLINE_AGENT role', () => {
    const agent = new HelplineAgent({
      id: 'agent-1',
      email: 'agent@fixmyitch.com',
      fullName: 'Sarah Agent',
      phoneNumber: '+1987654321',
      spokenLanguages: ['en', 'es'],
    });

    expect(agent).toBeInstanceOf(User);
    expect(agent.getRole()).toBe(Role.HELPLINE_AGENT);
    expect(agent.getSpokenLanguages()).toContain('en');
  });

  it('creates ProviderStaff with PROVIDER_STAFF role', () => {
    const staff = new ProviderStaff({
      id: 'staff-1',
      email: 'staff@fixmyitch.com',
      fullName: 'John Staff',
      phoneNumber: '+1122334455',
      providerId: 'hosp-1',
      facilityRole: 'Receptionist',
    });

    expect(staff).toBeInstanceOf(User);
    expect(staff.getRole()).toBe(Role.PROVIDER_STAFF);
    expect(staff.getProviderId()).toBe('hosp-1');
  });

  it('creates Admin with ADMIN role', () => {
    const admin = new Admin({
      id: 'admin-1',
      email: 'admin@fixmyitch.com',
      fullName: 'Root Admin',
      phoneNumber: '+1555666777',
      department: 'Compliance',
    });

    expect(admin).toBeInstanceOf(User);
    expect(admin.getRole()).toBe(Role.ADMIN);
    expect(admin.getDepartment()).toBe('Compliance');
  });
});

describe('HelplineCase State Transitions & Urgency', () => {
  const createCase = (urgency: HelplineUrgency = HelplineUrgency.ROUTINE) =>
    new HelplineCase({
      id: 'case-1',
      travelerId: 'trav-1',
      cityId: 'city-1',
      subject: 'Severe allergic skin rash after hike',
      initialDescription: 'Need English speaking dermatologist urgently in Bangkok',
      preferredLanguageCode: 'en',
      urgency,
    });

  describe('Urgency & Priorities', () => {
    it('supports EMERGENCY, URGENT, ROUTINE urgency levels', () => {
      const emergencyCase = createCase(Urgency.EMERGENCY);
      expect(emergencyCase.getUrgency()).toBe(HelplineUrgency.EMERGENCY);
      expect(emergencyCase.getPriority()).toBe(HelplineCasePriority.CRITICAL);
      expect(emergencyCase.isUrgent()).toBe(true);

      const urgentCase = createCase(Urgency.URGENT);
      expect(urgentCase.getUrgency()).toBe(HelplineUrgency.URGENT);
      expect(urgentCase.getPriority()).toBe(HelplineCasePriority.HIGH);
      expect(urgentCase.isUrgent()).toBe(true);

      const routineCase = createCase(Urgency.ROUTINE);
      expect(routineCase.getUrgency()).toBe(HelplineUrgency.ROUTINE);
      expect(routineCase.getPriority()).toBe(HelplineCasePriority.MEDIUM);
    });

    it('escalates urgency from ROUTINE to EMERGENCY', () => {
      const c = createCase(HelplineUrgency.ROUTINE);
      expect(c.getUrgency()).toBe(HelplineUrgency.ROUTINE);

      c.escalate(HelplineUrgency.EMERGENCY);
      expect(c.getUrgency()).toBe(HelplineUrgency.EMERGENCY);
      expect(c.getPriority()).toBe(HelplineCasePriority.CRITICAL);
    });
  });

  describe('Happy Path: NEW -> ASSIGNED -> RECOMMENDED -> RESOLVED', () => {
    it('transitions through the full lifecycle correctly', () => {
      const c = createCase();
      expect(c.getStatus()).toBe(HelplineCaseStatus.NEW);

      // 1. assign
      c.assign('agent-99');
      expect(c.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      expect(c.getAgentId()).toBe('agent-99');

      // 2. recommend
      c.recommend('doc-101', 'Recommended Bangkok International Dermatology Clinic');
      expect(c.getStatus()).toBe(HelplineCaseStatus.RECOMMENDED);
      expect(c.getRecommendedProviderId()).toBe('doc-101');
      expect(c.getRecommendationNotes()).toBe(
        'Recommended Bangkok International Dermatology Clinic',
      );

      // 3. resolve
      c.resolve('Traveler booked emergency consultation at Bangkok Int Clinic and confirmed attendance');
      expect(c.getStatus()).toBe(HelplineCaseStatus.RESOLVED);
      expect(c.getResolutionSummary()).toContain('Traveler booked emergency consultation');
      expect(c.getResolvedAt()).toBeInstanceOf(Date);
    });
  });

  describe('Invalid State Transitions', () => {
    it('throws when trying to recommend before assignment (from NEW)', () => {
      const c = createCase();
      expect(() => c.recommend('doc-101')).toThrow(
        `Cannot recommend provider for case in ${HelplineCaseStatus.NEW} status: must be in ${HelplineCaseStatus.ASSIGNED} status`,
      );
    });

    it('throws when trying to resolve directly from NEW', () => {
      const c = createCase();
      expect(() => c.resolve('Attempting direct resolution')).toThrow(
        `Cannot resolve case in ${HelplineCaseStatus.NEW} status: must be ASSIGNED or RECOMMENDED first`,
      );
    });

    it('throws when re-assigning a RECOMMENDED case', () => {
      const c = createCase();
      c.assign('agent-1');
      c.recommend('doc-1');

      expect(() => c.assign('agent-2')).toThrow(
        `Cannot assign case in ${HelplineCaseStatus.RECOMMENDED} status: must be in ${HelplineCaseStatus.NEW} status`,
      );
    });

    it('throws when trying to assign a RESOLVED case', () => {
      const c = createCase();
      c.assign('agent-1');
      c.recommend('doc-1');
      c.resolve('Case resolved successfully');

      expect(() => c.assign('agent-2')).toThrow(
        `Cannot assign case in ${HelplineCaseStatus.RESOLVED} status: must be in ${HelplineCaseStatus.NEW} status`,
      );
    });

    it('throws when trying to recommend on a RESOLVED case', () => {
      const c = createCase();
      c.assign('agent-1');
      c.recommend('doc-1');
      c.resolve('Case resolved successfully');

      expect(() => c.recommend('doc-2')).toThrow(
        `Cannot recommend provider for case in ${HelplineCaseStatus.RESOLVED} status: must be in ${HelplineCaseStatus.ASSIGNED} status`,
      );
    });

    it('throws when escalating a RESOLVED case', () => {
      const c = createCase();
      c.assign('agent-1');
      c.recommend('doc-1');
      c.resolve('Case resolved successfully');

      expect(() => c.escalate(HelplineUrgency.EMERGENCY)).toThrow(
        `Cannot escalate a ${HelplineCaseStatus.RESOLVED} case`,
      );
    });

    it('validates required inputs for assign, recommend, resolve', () => {
      const c = createCase();
      expect(() => c.assign('')).toThrow('Agent ID is required for assignment');

      c.assign('agent-1');
      expect(() => c.recommend('')).toThrow(
        'Provider ID is required to make a recommendation',
      );

      c.recommend('doc-1');
      expect(() => c.resolve('')).toThrow(
        'Detailed resolution summary is required to resolve case',
      );
      expect(() => c.resolve('tiny')).toThrow(
        'Detailed resolution summary is required to resolve case',
      );
    });
  });
});
