export type LedgerEntryType = 'freeze' | 'unfreeze' | 'settlement' | 'refund' | 'withdrawal';
export type LedgerEntryStatus = 'pending' | 'completed' | 'reversed';
export type SettlementType = 'milestone' | 'one_time';

export interface LedgerAccount {
  id: string;
  referenceId: string;
  referenceType: 'lead' | 'order';
  balance: number;
  frozenAmount: number;
  status: 'active' | 'closed';
  bankRef: string;
  createdAt: number;
  updatedAt: number;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  amount: number;
  milestoneLabel: string | null;
  status: LedgerEntryStatus;
  createdBy: string;
  createdAt: number;
  note: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  account: LedgerAccount;
  entries: LedgerEntry[];
  totalAmount: number;
  generatedAt: number;
}

export interface VoucherData {
  voucherNumber: string;
  entry: LedgerEntry;
  account: LedgerAccount;
  generatedAt: number;
}
