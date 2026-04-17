import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import Jobs from '../../src/routes/Jobs.svelte';
import { __resetForTests, put } from '../../src/services/db';
import { ensureFirstRunSeed, listUsers } from '../../src/services/auth.service';
import { setSession, clearSession } from '../../src/stores/session.store';
import { jobService } from '../../src/services/job.service';
import { toasts } from '../../src/stores/toast.store';
import type { Job } from '../../src/types/job.types';

async function freshDb() {
  await __resetForTests();
  clearSession();
  localStorage.clear();
  toasts.set([]);
  jobService.jobsStore.set([]);
  const req = indexedDB.deleteDatabase('forgeops');
  await new Promise<void>((resolve) => {
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('Jobs route', () => {
  beforeEach(freshDb);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    jobService.jobsStore.set([]);
  });

  it('mounts the AppShell + JobQueue and shows the empty state', async () => {
    await ensureFirstRunSeed();
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    setSession({ userId: admin.id, username: admin.username, role: admin.role });

    const { findByText } = render(Jobs);
    await findByText('Async Job Queue');
    await findByText('No jobs yet');
  });

  it('seeded jobs in the store render in the queue table with progress and runtime', async () => {
    await ensureFirstRunSeed();
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    setSession({ userId: admin.id, username: admin.username, role: admin.role });

    const job: Job = {
      id: 'seed-1',
      type: 'ledger_reconcile',
      status: 'completed',
      progress: 100,
      inputRef: 'x',
      resultRef: null,
      startedAt: Date.now() - 2000,
      completedAt: Date.now(),
      errorMessage: null,
      runtimeMs: 1500
    };
    await put('jobs', job);
    // Seed the reactive store directly so the JobQueue's subscribe picks it
    // up immediately, regardless of the async initJobStore refresh timing.
    jobService.jobsStore.set([job]);

    const { container } = render(Jobs);
    // Poll for the row to appear (initJobStore may re-read IDB + re-render).
    for (let i = 0; i < 60; i++) {
      if (container.textContent?.includes('ledger_reconcile')) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(container.textContent).toContain('ledger_reconcile');
    expect(container.textContent).toContain('completed');
    expect(container.textContent).toContain('1.5s');
  });
});
