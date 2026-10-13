import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  Notifier,
  SentNotificationRecord,
} from './notifier.interface';

/**
 * Email implementation of the Notifier interface.
 * Implements mock sending for travel insurance updates, case resolution summaries,
 * and clinic recommendation details.
 */
@Injectable()
export class EmailNotifier implements Notifier {
  public readonly channel = NotificationChannel.EMAIL;
  private readonly sentMessages: SentNotificationRecord[] = [];
  private shouldFail = false;
  private failureError = 'Simulated SMTP relay error';

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
    const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Validate email recipient
    if (!payload.recipient || payload.recipient.trim() === '') {
      return {
        success: false,
        messageId,
        recipient: '',
        channel: this.channel,
        sentAt,
        error: 'Recipient email address is required',
      };
    }

    const cleanedEmail = payload.recipient.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanedEmail)) {
      return {
        success: false,
        messageId,
        recipient: cleanedEmail,
        channel: this.channel,
        sentAt,
        error: `Invalid email address format: "${cleanedEmail}"`,
      };
    }

    // Validate message body
    if (!payload.message || payload.message.trim() === '') {
      return {
        success: false,
        messageId,
        recipient: cleanedEmail,
        channel: this.channel,
        sentAt,
        error: 'Email body content cannot be empty',
      };
    }

    // Check simulated failure
    if (this.shouldFail) {
      return {
        success: false,
        messageId,
        recipient: cleanedEmail,
        channel: this.channel,
        sentAt,
        error: this.failureError,
      };
    }

    const resolvedSubject = payload.subject?.trim() || 'TravelDoc Notification';

    // Record mock sent message
    const record: SentNotificationRecord = {
      messageId,
      recipient: cleanedEmail,
      message: payload.message.trim(),
      subject: resolvedSubject,
      channel: this.channel,
      sentAt,
      metadata: payload.metadata,
    };
    this.sentMessages.push(record);

    return {
      success: true,
      messageId,
      recipient: cleanedEmail,
      channel: this.channel,
      sentAt,
      details: {
        subject: resolvedSubject,
        mockProvider: 'MockSendGridMailer',
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
