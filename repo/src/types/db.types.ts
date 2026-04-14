import type { User } from './auth.types';
import type { Lead } from './lead.types';
import type { Plan, PlanVersion, BomItem, ShareToken } from './plan.types';
import type {
  Delivery,
  DeliveryPod,
  DeliveryException,
  Depot,
  DeliveryApiQueueEntry
} from './delivery.types';
import type { LedgerAccount, LedgerEntry } from './ledger.types';
import type {
  Notification,
  NotificationRead,
  NotificationSubscription,
  DndSettings
} from './notification.types';
import type { Job, JobInputRecord, JobResultRecord, JobCheckpoint } from './job.types';

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  detail: Record<string, unknown>;
  timestamp: number;
}

export interface DbSchema {
  users: User;
  leads: Lead;
  plans: Plan;
  plan_versions: PlanVersion;
  bom_items: BomItem;
  share_tokens: ShareToken;
  deliveries: Delivery;
  delivery_pods: DeliveryPod;
  delivery_exceptions: DeliveryException;
  delivery_api_queue: DeliveryApiQueueEntry;
  depots: Depot;
  ledger_accounts: LedgerAccount;
  ledger_entries: LedgerEntry;
  notifications: Notification;
  notification_reads: NotificationRead;
  notification_subscriptions: NotificationSubscription;
  notification_dnd: DndSettings;
  jobs: Job;
  job_inputs: JobInputRecord;
  job_results: JobResultRecord;
  job_checkpoints: JobCheckpoint;
  audit_log: AuditEntry;
}

export type StoreName = keyof DbSchema;
