export type JobType = 'bom_compare' | 'bulk_delivery' | 'ledger_reconcile';
export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  inputRef: string;
  resultRef: string | null;
  startedAt: number | null;
  completedAt: number | null;
  errorMessage: string | null;
  runtimeMs: number | null;
}

export interface JobInputRecord {
  id: string;
  data: unknown;
}

export interface JobResultRecord {
  id: string;
  data: unknown;
}
