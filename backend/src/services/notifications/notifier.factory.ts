import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Notifier,
} from './notifier.interface';
import { SmsNotifier } from './sms.notifier';
import { EmailNotifier } from './email.notifier';

export type NotifierCreator = () => Notifier;

/**
 * Factory creating and managing Notifier implementations.
 * Supports static creation, NestJS dependency injection, and custom channel registration.
 */
@Injectable()
export class NotifierFactory {
  private static readonly globalRegistry = new Map<string, NotifierCreator>();
  private readonly instanceRegistry = new Map<string, NotifierCreator>();

  constructor() {
    this.registerDefaults();
  }

  // ─── Default Registration ────────────────────────────────────────────────────

  private registerDefaults(): void {
    this.register(NotificationChannel.SMS, () => new SmsNotifier());
    this.register(NotificationChannel.EMAIL, () => new EmailNotifier());
  }

  static {
    // Initialize static global registry defaults
    NotifierFactory.globalRegistry.set(
      NotificationChannel.SMS,
      () => new SmsNotifier(),
    );
    NotifierFactory.globalRegistry.set(
      NotificationChannel.EMAIL,
      () => new EmailNotifier(),
    );
  }

  // ─── Instance API ────────────────────────────────────────────────────────────

  /**
   * Registers a custom notifier constructor or factory function for a channel.
   */
  public register(
    channel: NotificationChannel | string,
    creator: NotifierCreator,
  ): void {
    const key = channel.trim().toUpperCase();
    this.instanceRegistry.set(key, creator);
  }

  /**
   * Creates a new Notifier for the specified channel.
   *
   * @param channel - 'SMS' | 'EMAIL' (case-insensitive)
   * @throws Error if channel is unsupported
   */
  public create(channel: NotificationChannel | string): Notifier {
    if (!channel || channel.trim() === '') {
      throw new Error('Notification channel cannot be empty');
    }

    const key = channel.trim().toUpperCase();
    const creator =
      this.instanceRegistry.get(key) || NotifierFactory.globalRegistry.get(key);

    if (!creator) {
      const supported = Array.from(
        new Set([
          ...this.instanceRegistry.keys(),
          ...NotifierFactory.globalRegistry.keys(),
        ]),
      ).join(', ');
      throw new Error(
        `Unsupported notification channel: "${channel}". Supported channels: ${supported}`,
      );
    }

    return creator();
  }

  /** Alias for create() */
  public getNotifier(channel: NotificationChannel | string): Notifier {
    return this.create(channel);
  }

  /** Convenience getter for SmsNotifier */
  public getSmsNotifier(): SmsNotifier {
    return this.create(NotificationChannel.SMS) as SmsNotifier;
  }

  /** Convenience getter for EmailNotifier */
  public getEmailNotifier(): EmailNotifier {
    return this.create(NotificationChannel.EMAIL) as EmailNotifier;
  }

  // ─── Static Helper API ───────────────────────────────────────────────────────

  /**
   * Static factory method for quick instantiation without DI container.
   */
  public static create(channel: NotificationChannel | string): Notifier {
    if (!channel || channel.trim() === '') {
      throw new Error('Notification channel cannot be empty');
    }

    const key = channel.trim().toUpperCase();
    const creator = NotifierFactory.globalRegistry.get(key);

    if (!creator) {
      const supported = Array.from(NotifierFactory.globalRegistry.keys()).join(
        ', ',
      );
      throw new Error(
        `Unsupported notification channel: "${channel}". Supported channels: ${supported}`,
      );
    }

    return creator();
  }

  /** Static alias for static create() */
  public static getNotifier(channel: NotificationChannel | string): Notifier {
    return NotifierFactory.create(channel);
  }

  /**
   * Registers a custom channel into the static global registry.
   */
  public static register(
    channel: NotificationChannel | string,
    creator: NotifierCreator,
  ): void {
    NotifierFactory.globalRegistry.set(channel.trim().toUpperCase(), creator);
  }

  /**
   * Resets the static registry back to default SMS and EMAIL notifiers.
   */
  public static resetDefaults(): void {
    NotifierFactory.globalRegistry.clear();
    NotifierFactory.globalRegistry.set(
      NotificationChannel.SMS,
      () => new SmsNotifier(),
    );
    NotifierFactory.globalRegistry.set(
      NotificationChannel.EMAIL,
      () => new EmailNotifier(),
    );
  }
}
