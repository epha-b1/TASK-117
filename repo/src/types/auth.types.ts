export type UserRole =
  | 'administrator'
  | 'sales_coordinator'
  | 'planner'
  | 'dispatcher'
  | 'auditor';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  userId: string;
  username: string;
  role: UserRole;
  expiresAt: number;
}
