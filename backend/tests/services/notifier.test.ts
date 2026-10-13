import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Notifier,
  NotificationChannel,
  SmsNotifier,
  EmailNotifier,
  NotifierFactory,
  NotificationResult,
} from '../../src/services';

describe('Notification System (Notifier, SmsNotifier, EmailNotifier, NotifierFactory)', () => {
  // ─── SmsNotifier ────────────────────────────────────────────────────────────

  describe('SmsNotifier (Mock Sending)', () => {
    let smsNotifier: SmsNotifier;

    beforeEach(() => {
      smsNotifier = new SmsNotifier();
    });

    it('identifies as SMS channel', () => {
      expect(smsNotifier.channel).toBe(NotificationChannel.SMS);
    });

    it('sends SMS using positional arguments (recipient, message)', async () => {
      const result = await smsNotifier.send('+919876543210', 'Your emergency case has been assigned to agent Raj.');

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(result.recipient).toBe('+919876543210');
      expect(result.messageId).toMatch(/^sms-/);
      expect(result.sentAt).toBeInstanceOf(Date);

      const sent = smsNotifier.getSentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].recipient).toBe('+919876543210');
      expect(sent[0].message).toContain('assigned to agent Raj');
    });

    it('sends SMS using payload object', async () => {
      const result = await smsNotifier.send({
        recipient: '+1-555-234-5678',
        message: 'Clinic appointment confirmed for 14:00.',
        subject: 'Appointment Alert',
        metadata: { caseId: 'case-123' },
      });

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('+1-555-234-5678');

      const last = smsNotifier.getLastSentMessage();
      expect(last).toBeDefined();
      expect(last?.subject).toBe('Appointment Alert');
      expect(last?.metadata).toEqual({ caseId: 'case-123' });
    });

    it('rejects invalid or empty phone numbers', async () => {
      const emptyResult = await smsNotifier.send('', 'Test alert');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('Recipient phone number is required');

      const invalidResult = await smsNotifier.send('not-a-phone-number', 'Test alert');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Invalid phone number format');

      expect(smsNotifier.getSentMessages()).toHaveLength(0);
    });

    it('rejects empty message body', async () => {
      const result = await smsNotifier.send('+15551234567', '   ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('SMS message content cannot be empty');
      expect(smsNotifier.getSentMessages()).toHaveLength(0);
    });

    it('handles simulated network failure and recovery', async () => {
      smsNotifier.setShouldFail(true, 'Telecom provider outage');

      const failedResult = await smsNotifier.send('+15551234567', 'Urgent alert');
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Telecom provider outage');
      expect(smsNotifier.getSentMessages()).toHaveLength(0);

      // Recover
      smsNotifier.setShouldFail(false);
      const successResult = await smsNotifier.send('+15551234567', 'Urgent alert recovered');
      expect(successResult.success).toBe(true);
      expect(smsNotifier.getSentMessages()).toHaveLength(1);
    });

    it('clears mock sent messages history', async () => {
      await smsNotifier.send('+15551112222', 'Message 1');
      await smsNotifier.send('+15553334444', 'Message 2');
      expect(smsNotifier.getSentMessages()).toHaveLength(2);

      smsNotifier.clearSentMessages();
      expect(smsNotifier.getSentMessages()).toHaveLength(0);
      expect(smsNotifier.getLastSentMessage()).toBeUndefined();
    });
  });

  // ─── EmailNotifier ──────────────────────────────────────────────────────────

  describe('EmailNotifier (Mock Sending)', () => {
    let emailNotifier: EmailNotifier;

    beforeEach(() => {
      emailNotifier = new EmailNotifier();
    });

    it('identifies as EMAIL channel', () => {
      expect(emailNotifier.channel).toBe(NotificationChannel.EMAIL);
    });

    it('sends Email using positional arguments (recipient, message, subject)', async () => {
      const result = await emailNotifier.send(
        'traveler@example.com',
        'Here is your verified clinic consultation receipt.',
        'Clinic Receipt',
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(result.recipient).toBe('traveler@example.com');
      expect(result.messageId).toMatch(/^email-/);
      expect(result.sentAt).toBeInstanceOf(Date);

      const sent = emailNotifier.getSentMessages();
      expect(sent).toHaveLength(1);
      expect(sent[0].recipient).toBe('traveler@example.com');
      expect(sent[0].subject).toBe('Clinic Receipt');
      expect(sent[0].message).toContain('consultation receipt');
    });

    it('uses default subject when none is specified', async () => {
      const result = await emailNotifier.send('traveler@example.com', 'Emergency update');
      expect(result.success).toBe(true);

      const last = emailNotifier.getLastSentMessage();
      expect(last?.subject).toBe('TravelDoc Notification');
    });

    it('sends Email using payload object', async () => {
      const result = await emailNotifier.send({
        recipient: 'agent@fixmyitch.com',
        subject: 'New Case Assigned',
        message: 'Case case-999 has been assigned to you.',
        metadata: { caseId: 'case-999', urgency: 'EMERGENCY' },
      });

      expect(result.success).toBe(true);
      const last = emailNotifier.getLastSentMessage();
      expect(last?.metadata).toEqual({ caseId: 'case-999', urgency: 'EMERGENCY' });
    });

    it('rejects invalid or empty email addresses', async () => {
      const emptyResult = await emailNotifier.send('', 'Test');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('Recipient email address is required');

      const invalidEmail = await emailNotifier.send('invalid-email-no-at', 'Test');
      expect(invalidEmail.success).toBe(false);
      expect(invalidEmail.error).toContain('Invalid email address format');

      const missingDomain = await emailNotifier.send('user@nodomain', 'Test');
      expect(missingDomain.success).toBe(false);

      expect(emailNotifier.getSentMessages()).toHaveLength(0);
    });

    it('rejects empty message body', async () => {
      const result = await emailNotifier.send('user@example.com', '   ', 'Subject');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email body content cannot be empty');
      expect(emailNotifier.getSentMessages()).toHaveLength(0);
    });

    it('handles simulated SMTP failure and recovery', async () => {
      emailNotifier.setShouldFail(true, 'SMTP timeout connecting to mail exchange');

      const failedResult = await emailNotifier.send('user@example.com', 'Test alert');
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('SMTP timeout connecting to mail exchange');

      emailNotifier.setShouldFail(false);
      const successResult = await emailNotifier.send('user@example.com', 'Recovered alert');
      expect(successResult.success).toBe(true);
      expect(emailNotifier.getSentMessages()).toHaveLength(1);
    });

    it('clears mock sent messages history', async () => {
      await emailNotifier.send('a@test.com', 'Msg 1');
      await emailNotifier.send('b@test.com', 'Msg 2');
      expect(emailNotifier.getSentMessages()).toHaveLength(2);

      emailNotifier.clearSentMessages();
      expect(emailNotifier.getSentMessages()).toHaveLength(0);
      expect(emailNotifier.getLastSentMessage()).toBeUndefined();
    });
  });

  // ─── NotifierFactory ────────────────────────────────────────────────────────

  describe('NotifierFactory', () => {
    let factory: NotifierFactory;

    beforeEach(() => {
      factory = new NotifierFactory();
      NotifierFactory.resetDefaults();
    });

    afterEach(() => {
      NotifierFactory.resetDefaults();
    });

    describe('Instance API', () => {
      it('creates an SmsNotifier when requesting SMS channel (case-insensitive)', () => {
        const notifier1 = factory.create(NotificationChannel.SMS);
        const notifier2 = factory.create('sms');
        const notifier3 = factory.create('SMS');

        expect(notifier1).toBeInstanceOf(SmsNotifier);
        expect(notifier2).toBeInstanceOf(SmsNotifier);
        expect(notifier3).toBeInstanceOf(SmsNotifier);
        expect(notifier1.channel).toBe(NotificationChannel.SMS);
      });

      it('creates an EmailNotifier when requesting EMAIL channel (case-insensitive)', () => {
        const notifier1 = factory.create(NotificationChannel.EMAIL);
        const notifier2 = factory.create('email');
        const notifier3 = factory.create('Email');

        expect(notifier1).toBeInstanceOf(EmailNotifier);
        expect(notifier2).toBeInstanceOf(EmailNotifier);
        expect(notifier3).toBeInstanceOf(EmailNotifier);
        expect(notifier1.channel).toBe(NotificationChannel.EMAIL);
      });

      it('provides convenience getters getSmsNotifier() and getEmailNotifier()', () => {
        const sms = factory.getSmsNotifier();
        const email = factory.getEmailNotifier();

        expect(sms).toBeInstanceOf(SmsNotifier);
        expect(email).toBeInstanceOf(EmailNotifier);
      });

      it('throws an error for unsupported channel', () => {
        expect(() => factory.create('carrier_pigeon')).toThrow(
          'Unsupported notification channel: "carrier_pigeon"',
        );
      });

      it('throws an error for empty channel', () => {
        expect(() => factory.create('')).toThrow(
          'Notification channel cannot be empty',
        );
        expect(() => factory.create('   ')).toThrow(
          'Notification channel cannot be empty',
        );
      });

      it('registers and produces custom notifiers on factory instance', async () => {
        class MockWhatsAppNotifier implements Notifier {
          readonly channel = 'WHATSAPP';
          private sent: any[] = [];
          async send(payload: any) {
            this.sent.push(payload);
            return {
              success: true,
              messageId: 'wa-1',
              recipient: payload.recipient || payload,
              channel: 'WHATSAPP',
              sentAt: new Date(),
            };
          }
          getSentMessages() {
            return this.sent;
          }
          clearSentMessages() {
            this.sent = [];
          }
        }

        factory.register('WHATSAPP', () => new MockWhatsAppNotifier());

        const waNotifier = factory.create('whatsapp');
        expect(waNotifier).toBeInstanceOf(MockWhatsAppNotifier);
        expect(waNotifier.channel).toBe('WHATSAPP');

        const result = await waNotifier.send({
          recipient: '+1234567890',
          message: 'Hello WhatsApp',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Static API', () => {
      it('creates SmsNotifier via static NotifierFactory.create()', () => {
        const notifier = NotifierFactory.create('sms');
        expect(notifier).toBeInstanceOf(SmsNotifier);
      });

      it('creates EmailNotifier via static NotifierFactory.create()', () => {
        const notifier = NotifierFactory.create('email');
        expect(notifier).toBeInstanceOf(EmailNotifier);
      });

      it('throws via static create() on unsupported channel', () => {
        expect(() => NotifierFactory.create('fax')).toThrow(
          'Unsupported notification channel: "fax"',
        );
      });

      it('registers custom notifier globally on NotifierFactory', () => {
        class MockPushNotifier implements Notifier {
          readonly channel = 'PUSH';
          async send() {
            return {
              success: true,
              messageId: 'push-1',
              recipient: 'device-token',
              channel: 'PUSH',
              sentAt: new Date(),
            };
          }
          getSentMessages() {
            return [];
          }
          clearSentMessages() {}
        }

        NotifierFactory.register('PUSH', () => new MockPushNotifier());

        const notifier = NotifierFactory.create('push');
        expect(notifier).toBeInstanceOf(MockPushNotifier);
        expect(notifier.channel).toBe('PUSH');
      });
    });
  });
});
