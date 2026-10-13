/**
 * Supported notification delivery channels.
 */
export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

/**
 * Payload structure for dispatching a notification.
 */
export interface NotificationPayload {
  recipient: string;
  message: string;
  subject?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result returned upon sending a notification.
 */
export interface NotificationResult {
  success: boolean;
  messageId: string;
  recipient: string;
  channel: NotificationChannel | string;
  sentAt: Date;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Record of a sent notification (used for logging and mock inspection in tests).
 */
export interface SentNotificationRecord {
  messageId: string;
  recipient: string;
  message: string;
  subject?: string;
  channel: NotificationChannel | string;
  sentAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Port/Interface for notification delivery mechanisms.
 */
export interface Notifier {
  /** The channel this notifier handles (e.g. SMS, EMAIL) */
  readonly channel: NotificationChannel | string;

  /**
   * Dispatches a notification.
   * Supports both object payload and positional arguments.
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;
  send(recipient: string, message: string, subject?: string): Promise<NotificationResult>;
  send(
    recipientOrPayload: string | NotificationPayload,
    message?: string,
    subject?: string,
  ): Promise<NotificationResult>;

  /**
   * Inspects sent notifications in mock/test mode.
   */
  getSentMessages(): SentNotificationRecord[];

  /**
   * Clears mock sent messages history.
   */
  clearSentMessages(): void;
}

/**
 * Injection token for Notifier / NotifierFactory in NestJS dependency injection.
 */
export const NOTIFIER_FACTORY = Symbol('NOTIFIER_FACTORY');
