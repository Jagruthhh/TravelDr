import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  Notifier,
  SentNotificationRecord,
} from './notifier.interface';

/**
 * SMS implementation of the Notifier interface.
 * Implements mock sending for testing emergency alerts and traveler OTPs.
 */
@Injectable()
export class SmsNotifier implements Notifier {
  public readonly channel = NotificationChannel.SMS;
  private readonly sentMessages: SentNotificationRecord[] = [];
  private shouldFail = false;
  private failureError = 'Simulated SMS dispatch network failure';

  /**
   * Configures simulated delivery failure for test scenarios.
   */
  public setShouldFail(shouldFail: boolean, errorMessage?: string): void {
    this.shouldFail = shouldFail;
    if (errorMessage) {
      this.failureError = errorMessage;
    }
  }

  public async send(
    recipientOrPayload: string | NotificationPayload,
    message?: string,
    subject?: string,
  ): Promise<NotificationResult> {
    const payload = this.normalizePayload(recipientOrPayload, message, subject);
    const sentAt = new Date();
    const messageId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Validate phone number recipient
    if (!payload.recipient || payload.recipient.trim() === '') {
      return {
        success: false,
        messageId,
        recipient: '',
        channel: this.channel,
        sentAt,
        error: 'Recipient phone number is required',
      };
    }

    const cleanedPhone = payload.recipient.trim();
    const phoneRegex = /^\+?[0-9\s\-().]{6,25}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return {
        success: false,
        messageId,
        recipient: cleanedPhone,
        channel: this.channel,
        sentAt,
        error: `Invalid phone number format: "${cleanedPhone}"`,
      };
    }

    // Validate message body
    if (!payload.message || payload.message.trim() === '') {
      return {
        success: false,
        messageId,
        recipient: cleanedPhone,
        channel: this.channel,
        sentAt,
        error: 'SMS message content cannot be empty',
      };
    }

    // Check simulated failure
    if (this.shouldFail) {
      return {
        success: false,
        messageId,
        recipient: cleanedPhone,
        channel: this.channel,
        sentAt,
        error: this.failureError,
      };
    }

    // Record mock sent message
    const record: SentNotificationRecord = {
      messageId,
      recipient: cleanedPhone,
      message: payload.message.trim(),
      subject: payload.subject?.trim(),
      channel: this.channel,
      sentAt,
      metadata: payload.metadata,
    };
    this.sentMessages.push(record);

    return {
      success: true,
      messageId,
      recipient: cleanedPhone,
      channel: this.channel,
      sentAt,
      details: {
        charactersCount: record.message.length,
        mockProvider: 'MockTwilioSmsGateway',
      },
    };
  }

  public getSentMessages(): SentNotificationRecord[] {
    return [...this.sentMessages];
  }

  public getLastSentMessage(): SentNotificationRecord | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  public clearSentMessages(): void {
    this.sentMessages.length = 0;
  }

  private normalizePayload(
    recipientOrPayload: string | NotificationPayload,
    message?: string,
    subject?: string,
  ): NotificationPayload {
    if (typeof recipientOrPayload === 'string') {
      return {
        recipient: recipientOrPayload,
        message: message ?? '',
        subject,
      };
    }
    return recipientOrPayload;
  }
}
