import type { User } from '../types/auth.types';

export function getNextAssignee(
  users: User[],
  lastAssignments: Record<string, number>
): string | null {
  const eligible = users.filter((u) => u.isActive);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    const la = lastAssignments[a.id] ?? 0;
    const lb = lastAssignments[b.id] ?? 0;
    if (la !== lb) return la - lb;
    return a.createdAt - b.createdAt;
  });
  return eligible[0].id;
}
