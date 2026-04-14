import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetForTests, get, getAll, put } from '../../src/services/db';
import { clearSession } from '../../src/stores/session.store';
import { ensureFirstRunSeed, listUsers, register } from '../../src/services/auth.service';
import { listNotifications } from '../../src/services/notification.service';
import type { MainToWorker, WorkerToMain } from '../../src/workers/protocol';
import type { Job, JobCheckpoint } from '../../src/types/job.types';

async function freshDb() {
  await __resetForTests();
  clearSession();
  localStorage.clear();
  const req = indexedDB.deleteDatabase('forgeops');
  await new Promise<void>((resolve) => {
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

type Handler = (ev: MessageEvent<WorkerToMain>) => void;

interface FakeWorkerController {
  instances: FakeWorker[];
  received: MainToWorker[];
}

class FakeWorker {
  onmessage: Handler | null = null;
  onerror: ((ev: Event) => void) | null = null;
  sent: MainToWorker[] = [];
  terminated = false;

  constructor(public controller: FakeWorkerController) {
    controller.instances.push(this);
  }

  postMessage(msg: MainToWorker) {
    this.sent.push(msg);
    this.controller.received.push(msg);
  }

  terminate() {
    this.terminated = true;
  }

  // Test-only: deliver a message from "worker" to main
  emit(msg: WorkerToMain) {
    if (this.onmessage) {
      this.onmessage({ data: msg } as MessageEvent<WorkerToMain>);
    }
  }

  addEventListener() {
    /* not used for our path */
  }
  removeEventListener() {
    /* not used */
  }
}

function installFakeWorker(): FakeWorkerController {
  const controller: FakeWorkerController = { instances: [], received: [] };
  (globalThis as unknown as { Worker: unknown }).Worker = class extends FakeWorker {
    constructor() {
      super(controller);
    }
  };
  return controller;
}

function uninstallFakeWorker() {
  delete (globalThis as unknown as { Worker?: unknown }).Worker;
}

async function waitFor<T>(fn: () => Promise<T | undefined>, attempts = 80): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const v = await fn();
    if (v !== undefined && v !== null) return v as T;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('waitFor: timed out');
}

describe('F-H1: job checkpoint persistence + resume', () => {
  let controller: FakeWorkerController;

  beforeEach(async () => {
    await freshDb();
    controller = installFakeWorker();
    await ensureFirstRunSeed();
    vi.resetModules();
  });

  afterEach(() => {
    uninstallFakeWorker();
  });

  it('persists checkpoint as worker reports progress and on pause', async () => {
    const { enqueue } = await import('../../src/services/job.service');
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    const planner = await register('cp1', 'passw0rd!', 'planner', admin.id);
    const job = await enqueue('bulk_delivery', { leads: [], depotId: 'd1' }, planner.id);

    // Wait for the main thread to have posted start to the worker.
    const fake = await waitFor(async () =>
      controller.instances[0] && controller.instances[0].sent.length > 0
        ? controller.instances[0]
        : undefined
    );

    // Simulate the worker emitting a checkpoint mid-run.
    fake.emit({
      jobId: job.id,
      kind: 'checkpoint',
      progress: 40,
      index: 4,
      partial: [{ leadId: 'l1', title: 't1', depotId: 'd1', recipientZip: '' }]
    });

    const cp = await waitFor<JobCheckpoint>(async () => await get('job_checkpoints', job.id));
    expect(cp.progress).toBe(40);
    expect(cp.index).toBe(4);
    expect(Array.isArray(cp.partial)).toBe(true);

    // Pause flow: worker emits another checkpoint then 'paused'.
    fake.emit({
      jobId: job.id,
      kind: 'checkpoint',
      progress: 55,
      index: 5,
      partial: [
        { leadId: 'l1', title: 't1', depotId: 'd1', recipientZip: '' },
        { leadId: 'l2', title: 't2', depotId: 'd1', recipientZip: '' }
      ]
    });
    fake.emit({ jobId: job.id, kind: 'paused' });

    const cp2 = await waitFor<JobCheckpoint>(async () => {
      const c = await get('job_checkpoints', job.id);
      return c && c.index === 5 ? c : undefined;
    });
    expect(cp2.index).toBe(5);
    expect((cp2.partial as unknown[]).length).toBe(2);

    const stored = await get('jobs', job.id);
    expect(stored?.status).toBe('paused');
  });

  it('resume after restart passes persisted checkpoint in start message', async () => {
    const { resume } = await import('../../src/services/job.service');
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    // Simulate: a prior session paused this job. Seed directly.
    const inputRef = 'ci-input-1';
    const jobId = 'ci-job-1';
    await put('job_inputs', {
      id: inputRef,
      data: { leads: [{ id: 'l3', title: 't3' }], depotId: 'd1' }
    });
    const persisted: Job = {
      id: jobId,
      type: 'bulk_delivery',
      status: 'paused',
      progress: 30,
      inputRef,
      resultRef: null,
      startedAt: Date.now() - 1000,
      completedAt: null,
      errorMessage: null,
      runtimeMs: null
    };
    await put('jobs', persisted);
    await put('job_checkpoints', {
      jobId,
      progress: 30,
      index: 3,
      partial: [{ leadId: 'l0', title: 't0', depotId: 'd1', recipientZip: '' }],
      updatedAt: Date.now()
    });
    void admin;

    await resume(jobId);

    // The service should spawn a worker and post 'start' with the checkpoint.
    const fake = await waitFor(async () =>
      controller.instances[0] && controller.instances[0].sent.length > 0
        ? controller.instances[0]
        : undefined
    );
    const startMsg = fake.sent.find((m) => m.cmd === 'start') as
      | (MainToWorker & { cmd: 'start' })
      | undefined;
    expect(startMsg).toBeDefined();
    expect(startMsg!.checkpoint).toBeDefined();
    expect(startMsg!.checkpoint!.index).toBe(3);
    expect(Array.isArray(startMsg!.checkpoint!.partial)).toBe(true);
  });

  it('clears checkpoint on complete and writes final result', async () => {
    const { enqueue } = await import('../../src/services/job.service');
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    const dispatcher = await register('dp1', 'passw0rd!', 'dispatcher', admin.id);
    const job = await enqueue('bulk_delivery', { leads: [], depotId: 'd1' }, dispatcher.id);
    const fake = await waitFor(async () =>
      controller.instances[0] && controller.instances[0].sent.length > 0
        ? controller.instances[0]
        : undefined
    );

    fake.emit({
      jobId: job.id,
      kind: 'checkpoint',
      progress: 50,
      index: 5,
      partial: []
    });
    await waitFor(async () => await get('job_checkpoints', job.id));

    fake.emit({ jobId: job.id, kind: 'complete', result: { ok: true } });

    await waitFor(async () => {
      const j = await get('jobs', job.id);
      return j?.status === 'completed' ? j : undefined;
    });
    const cp = await get('job_checkpoints', job.id);
    expect(cp).toBeUndefined();
  });
});

describe('F-H2: job alerts dispatch to real user recipients', () => {
  let controller: FakeWorkerController;

  beforeEach(async () => {
    await freshDb();
    controller = installFakeWorker();
    await ensureFirstRunSeed();
    vi.resetModules();
  });

  afterEach(() => {
    uninstallFakeWorker();
  });

  it('long-running alert is dispatched to admins/planners/dispatchers and visible', async () => {
    const { enqueue } = await import('../../src/services/job.service');
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    const planner = await register('pl1', 'passw0rd!', 'planner', admin.id);
    const dispatcher = await register('di1', 'passw0rd!', 'dispatcher', admin.id);
    const auditor = await register('au1', 'passw0rd!', 'auditor', admin.id);

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      const job = await enqueue('bom_compare', { a: [], b: [] }, admin.id);
      void job;
      await vi.advanceTimersByTimeAsync(30_001);
    } finally {
      vi.useRealTimers();
    }

    await waitFor(async () => {
      const notes = await listNotifications(admin.id);
      return notes.some((n) => n.eventType === 'job_long_running') ? true : undefined;
    });

    const adminNotes = await listNotifications(admin.id);
    const plannerNotes = await listNotifications(planner.id);
    const dispatcherNotes = await listNotifications(dispatcher.id);
    const auditorNotes = await listNotifications(auditor.id);

    expect(adminNotes.some((n) => n.eventType === 'job_long_running')).toBe(true);
    expect(plannerNotes.some((n) => n.eventType === 'job_long_running')).toBe(true);
    expect(dispatcherNotes.some((n) => n.eventType === 'job_long_running')).toBe(true);
    expect(auditorNotes.some((n) => n.eventType === 'job_long_running')).toBe(false);

    const raw = await getAll('notifications');
    const longRun = raw.filter((n) => n.eventType === 'job_long_running');
    expect(longRun.length).toBeGreaterThan(0);
    for (const n of longRun) expect(n.recipientId).not.toBe('system');
  });

  it('error-rate alert is dispatched to real user recipients and visible', async () => {
    const { enqueue } = await import('../../src/services/job.service');
    const users = await listUsers();
    const admin = users.find((u) => u.role === 'administrator')!;
    const planner = await register('pl2', 'passw0rd!', 'planner', admin.id);
    const dispatcher = await register('di2', 'passw0rd!', 'dispatcher', admin.id);

    // Seed enough past failed jobs to push rate above threshold.
    for (let i = 0; i < 50; i++) {
      await put('jobs', {
        id: 'pj-' + i,
        type: 'bom_compare',
        status: i < 47 ? 'completed' : 'failed',
        progress: 100,
        inputRef: 'ignored',
        resultRef: null,
        startedAt: i,
        completedAt: i,
        errorMessage: null,
        runtimeMs: 1
      });
    }

    // Run a job that will error, which triggers checkErrorRate after the error.
    const job = await enqueue('bom_compare', { a: [], b: [] }, admin.id);
    const fake = await waitFor(async () =>
      controller.instances[0] && controller.instances[0].sent.length > 0
        ? controller.instances[0]
        : undefined
    );
    fake.emit({ jobId: job.id, kind: 'error', message: 'boom' });

    // wait for dispatch to propagate
    await waitFor(async () => {
      const notes = await listNotifications(admin.id);
      return notes.some((n) => n.eventType === 'job_error_rate') ? true : undefined;
    });

    const adminNotes = await listNotifications(admin.id);
    const plannerNotes = await listNotifications(planner.id);
    const dispatcherNotes = await listNotifications(dispatcher.id);

    expect(adminNotes.some((n) => n.eventType === 'job_error_rate')).toBe(true);
    expect(plannerNotes.some((n) => n.eventType === 'job_error_rate')).toBe(true);
    expect(dispatcherNotes.some((n) => n.eventType === 'job_error_rate')).toBe(true);

    const raw = await getAll('notifications');
    const errs = raw.filter((n) => n.eventType === 'job_error_rate');
    for (const n of errs) expect(n.recipientId).not.toBe('system');
  });
});
