export type NotificationStatus = 'queued' | 'dispatched' | 'failed';

export interface Notification {
  id: string;
  templateId: string;
  eventType: string;
  variables: Record<string, string>;
  recipientId: string;
  status: NotificationStatus;
  dispatchedAt: number | null;
  retryCount: number;
  createdAt: number;
  renderedSubject: string;
  renderedBody: string;
}

export interface NotificationRead {
  id: string;
  notificationId: string;
  userId: string;
  readAt: number;
}

export interface NotificationSubscription {
  userId: string;
  eventType: string;
  subscribed: boolean;
}

export interface DndSettings {
  userId: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  enabled: boolean;
}
