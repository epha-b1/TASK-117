export type LeadStatus = 'new' | 'in_discussion' | 'quoted' | 'confirmed' | 'closed';

export interface LeadHistoryEntry {
  timestamp: number;
  actor: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  note: string;
}

export interface Lead {
  id: string;
  title: string;
  requirements: string;
  budget: number;
  availabilityStart: number;
  availabilityEnd: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: LeadStatus;
  assignedTo: string;
  lastUpdatedAt: number;
  slaFlagged: boolean;
  createdAt: number;
  updatedAt: number;
  history: LeadHistoryEntry[];
}

export interface CreateLeadInput {
  title: string;
  requirements: string;
  budget: number;
  availabilityStart: number;
  availabilityEnd: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  slaFlagged?: boolean;
}
