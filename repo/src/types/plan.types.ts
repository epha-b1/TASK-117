export type PlanStatus = 'draft' | 'active' | 'archived';

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  tags: string[];
  notes: string;
  currentVersion: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface BomItem {
  id: string;
  planId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  length?: number;
  sortOrder: number;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  bom: BomItem[];
  savedBy: string;
  savedAt: number;
  changeNote: string;
}

export interface PlanWithBom extends Plan {
  bom: BomItem[];
}

export interface BomDiff {
  added: BomItem[];
  removed: BomItem[];
  modified: Array<{ before: BomItem; after: BomItem; changedFields: string[] }>;
}

export interface ShareToken {
  id: string;
  planId: string;
  token: string;
  createdBy: string;
  expiresAt: number;
  revoked: boolean;
  createdAt: number;
}

export interface PlanFilters {
  status?: PlanStatus;
  tag?: string;
  search?: string;
  createdBy?: string;
}
