/**
 * Message domain entity representing communication in a helpline fallback case or inquiry.
 */
export class Message {
  private readonly id: string;
  private readonly caseId: string;
  private readonly senderId: string;
  private readonly senderName: string;
  private readonly content: string;
  private readonly isInternalNote: boolean;
  private readonly attachments: string[];
  private readonly sentAt: Date;

  constructor(params: {
    id: string;
    caseId: string;
    senderId: string;
    senderName: string;
    content: string;
    isInternalNote?: boolean;
    attachments?: string[];
    sentAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Message ID is required');
    }
    if (!params.caseId || params.caseId.trim() === '') {
      throw new Error('Case ID is required');
    }
    if (!params.senderId || params.senderId.trim() === '') {
      throw new Error('Sender ID is required');
    }
    if (!params.content || params.content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    this.id = params.id.trim();
    this.caseId = params.caseId.trim();
    this.senderId = params.senderId.trim();
    this.senderName = params.senderName.trim();
    this.content = params.content.trim();
    this.isInternalNote = params.isInternalNote ?? false;
    this.attachments = params.attachments ?? [];
    this.sentAt = params.sentAt ?? new Date();
  }

  public getId(): string {
    return this.id;
  }

  public getCaseId(): string {
    return this.caseId;
  }

  public getSenderId(): string {
    return this.senderId;
  }

  public getSenderName(): string {
    return this.senderName;
  }

  public getContent(): string {
    return this.content;
  }

  public getIsInternalNote(): boolean {
    return this.isInternalNote;
  }

  public getAttachments(): string[] {
    return [...this.attachments];
  }

  public getSentAt(): Date {
    return this.sentAt;
  }
}
