import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../../src/common/prisma.service';
import { PrismaProviderRepository } from '../../src/repositories/prisma-provider.repository';
import { PrismaCaseRepository } from '../../src/repositories/prisma-case.repository';
import {
  Hospital,
  Clinic,
  Doctor,
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  Message,
} from '../../src/domain';

describe('Prisma Repository Implementations', () => {
  let prisma: PrismaService;
  let providerRepo: PrismaProviderRepository;
  let caseRepo: PrismaCaseRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    providerRepo = new PrismaProviderRepository(prisma);
    caseRepo = new PrismaCaseRepository(prisma);
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  describe('PrismaProviderRepository', () => {
    it('retrieves all seeded providers and reconstructs domain entities properly', async () => {
      const providers = await providerRepo.findAll();
      expect(providers.length).toBeGreaterThanOrEqual(10);

      const hasHospital = providers.some((p) => p instanceof Hospital);
      const hasClinic = providers.some((p) => p instanceof Clinic);
      const hasDoctor = providers.some((p) => p instanceof Doctor);

      expect(hasHospital).toBe(true);
      expect(hasClinic).toBe(true);
      expect(hasDoctor).toBe(true);
    });

    it('filters providers by language code and verifies polymorphic methods', async () => {
      const russianProviders = await providerRepo.findByLanguage('ru');
      expect(russianProviders.length).toBeGreaterThanOrEqual(1);

      for (const provider of russianProviders) {
        expect(provider.supportsLanguage('ru')).toBe(true);
      }
    });

    it('saves and updates a doctor provider with licensing information', async () => {
      const cities = await prisma.city.findMany();
      expect(cities.length).toBeGreaterThan(0);

      const testDoctor = new Doctor({
        id: 'doc-repo-test-1',
        name: 'Dr. Test Dermatologist',
        cityId: cities[0].id,
        address: 'Banjara Hills, Hyderabad',
        contactNumber: '+919999900001',
        email: 'dr.test.derm@example.com',
        medicalLicenseNumber: 'TS-TEST-9988',
        yearsOfExperience: 10,
        spokenLanguageCodes: ['en', 'hi'],
      });

      await providerRepo.save(testDoctor);

      const fetched = await providerRepo.findById('doc-repo-test-1');
      expect(fetched).toBeDefined();
      expect(fetched).toBeInstanceOf(Doctor);
      expect((fetched as Doctor).getMedicalLicenseNumber()).toBe('TS-TEST-9988');

      // Cleanup
      await providerRepo.delete('doc-repo-test-1');
      const afterDelete = await providerRepo.findById('doc-repo-test-1');
      expect(afterDelete).toBeNull();
    });
  });

  describe('PrismaCaseRepository', () => {
    it('saves, loads, and updates a HelplineCase with messages', async () => {
      const cities = await prisma.city.findMany();
      const travelers = await prisma.traveler.findMany();

      // Create a test traveler if none exist
      let travelerId: string;
      if (travelers.length === 0) {
        const u = await prisma.user.create({
          data: {
            email: 'traveler.case.test@example.com',
            fullName: 'Test Traveler',
            phoneNumber: '+1234567890',
            role: 'TRAVELER',
            travelerProfile: {
              create: {
                homeCountry: 'USA',
              },
            },
          },
          include: { travelerProfile: true },
        });
        travelerId = u.travelerProfile!.id;
      } else {
        travelerId = travelers[0].id;
      }

      const helplineCase = new HelplineCase({
        id: 'case-repo-test-1',
        travelerId,
        cityId: cities[0].id,
        subject: 'Acute tropical dermatitis inquiry',
        initialDescription: 'Traveler with rash seeking immediate clinic consultation',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.URGENT,
      });

      // Add a message
      helplineCase.addMessage(
        new Message({
          id: 'msg-repo-test-1',
          caseId: 'case-repo-test-1',
          senderId: travelerId,
          senderName: 'Test Traveler',
          content: 'Hello, the rash has spread to my arms.',
        }),
      );

      // Save via repository
      await caseRepo.save(helplineCase);

      const fetched = await caseRepo.findById('case-repo-test-1');
      expect(fetched).toBeDefined();
      expect(fetched!.getId()).toBe('case-repo-test-1');
      expect(fetched!.getUrgency()).toBe(HelplineUrgency.URGENT);
      expect(fetched!.getMessages().length).toBe(1);
      expect(fetched!.getMessages()[0].getContent()).toContain('rash has spread');

      // Ensure a valid HelplineAgent exists for assignment foreign key
      let agent = await prisma.helplineAgent.findFirst();
      if (!agent) {
        const agentUser = await prisma.user.create({
          data: {
            email: 'agent.repo.test@example.com',
            fullName: 'Test Agent',
            phoneNumber: '+1987654321',
            role: 'HELPLINE_AGENT',
            helplineAgentProfile: {
              create: {
                isAvailableForDuty: true,
              },
            },
          },
          include: { helplineAgentProfile: true },
        });
        agent = agentUser.helplineAgentProfile!;
      }

      // Update state via domain method and re-save
      fetched!.assign(agent.id);
      await caseRepo.save(fetched!);

      const updated = await caseRepo.findById('case-repo-test-1');
      expect(updated!.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      expect(updated!.getAgentId()).toBe(agent.id);

      // Cleanup
      await caseRepo.delete('case-repo-test-1');
      const afterDelete = await caseRepo.findById('case-repo-test-1');
      expect(afterDelete).toBeNull();
    });
  });
});
