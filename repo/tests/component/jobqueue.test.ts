import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import JobQueue from '../../src/components/jobs/JobQueue.svelte';
import { jobService } from '../../src/services/job.service';
import { toasts } from '../../src/stores/toast.store';
import { setSession, clearSession } from '../../src/stores/session.store';
import type { Job } from '../../src/types/job.types';

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: overrides.id ?? 'j1',
    type: overrides.type ?? 'bom_compare',
    status: overrides.status ?? 'running',
    progress: overrides.progress ?? 20,
    inputRef: 'in1',
    resultRef: null,
    startedAt: overrides.startedAt ?? Date.now() - 1000,
    completedAt: null,
    errorMessage: overrides.errorMessage ?? null,
    runtimeMs: overrides.runtimeMs ?? null,
    ...overrides
  };
}

// The JobQueue component subscribes to `jobService.jobsStore` in its script
// init — before onMount runs. To avoid racing the subscribe → set, we:
//   1. Seed the store BEFORE render so subscribe picks it up immediately.
//   2. Stub initJobStore to a no-op so it doesn't overwrite the store.

describe('<JobQueue>', () => {
  beforeEach(() => {
    toasts.set([]);
    clearSession();
    jobService.jobsStore.set([]);
    vi.spyOn(jobService, 'initJobStore').mockResolvedValue(undefined);
  });
  afterEach(() => {
    toasts.set([]);
    clearSession();
    cleanup();
    vi.restoreAllMocks();
    jobService.jobsStore.set([]);
  });

  it('shows the empty state when no jobs', async () => {
    const { findByText } = render(JobQueue);
    await findByText('No jobs yet');
  });

  it('lists a running job with type, status, progress%, and runtime placeholder', async () => {
    jobService.jobsStore.set([buildJob({ status: 'running', progress: 42 })]);
    const { container } = render(JobQueue);
    expect(container.textContent).toContain('bom_compare');
    expect(container.textContent).toContain('running');
    expect(container.textContent).toContain('42%');
    expect(container.textContent).toMatch(/running since/);
  });

  it('shows Pause + Cancel for running jobs and invokes service calls', async () => {
    const pauseSpy = vi.spyOn(jobService, 'pause').mockResolvedValue(undefined);
    jobService.jobsStore.set([buildJob({ id: 'r1', status: 'running' })]);
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });

    const { findByText } = render(JobQueue);
    const pauseBtn = await findByText('Pause');
    await fireEvent.click(pauseBtn);
    expect(pauseSpy).toHaveBeenCalledWith('r1');
  });

  it('shows Resume + Cancel for paused jobs and invokes service.resume', async () => {
    const resumeSpy = vi.spyOn(jobService, 'resume').mockResolvedValue(undefined);
    jobService.jobsStore.set([buildJob({ id: 'p1', status: 'paused', progress: 60 })]);
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });

    const { findByText, queryByText } = render(JobQueue);
    const resumeBtn = await findByText('Resume');
    await fireEvent.click(resumeBtn);
    expect(resumeSpy).toHaveBeenCalledWith('p1');
    expect(queryByText('Pause')).toBeNull();
  });

  it('cancel pushes an info toast on success', async () => {
    const cancelSpy = vi.spyOn(jobService, 'cancel').mockResolvedValue(undefined);
    jobService.jobsStore.set([buildJob({ id: 'c1', status: 'running' })]);
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });

    const { findByText } = render(JobQueue);
    await fireEvent.click(await findByText('Cancel'));
    await Promise.resolve();
    expect(cancelSpy).toHaveBeenCalledWith('c1', 'u1');
    const list = get(toasts);
    expect(list.some((t) => t.level === 'info' && t.message === 'Job cancelled')).toBe(true);
  });

  it('cancel pushes an error toast when the service throws', async () => {
    vi.spyOn(jobService, 'cancel').mockRejectedValue(new Error('Role not permitted'));
    jobService.jobsStore.set([buildJob({ id: 'c2', status: 'running' })]);
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });

    const { findByText } = render(JobQueue);
    await fireEvent.click(await findByText('Cancel'));
    await new Promise((r) => setTimeout(r, 5));
    const list = get(toasts);
    expect(list.some((t) => t.level === 'error' && t.message === 'Role not permitted')).toBe(true);
  });

  it('cancel is a no-op when no session (guard branch)', async () => {
    const cancelSpy = vi.spyOn(jobService, 'cancel').mockResolvedValue(undefined);
    jobService.jobsStore.set([buildJob({ id: 'c3', status: 'running' })]);
    const { findByText } = render(JobQueue);
    await fireEvent.click(await findByText('Cancel'));
    await Promise.resolve();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('pause-error pushes an error toast', async () => {
    vi.spyOn(jobService, 'pause').mockRejectedValue(new Error('boom'));
    jobService.jobsStore.set([buildJob({ id: 'pe', status: 'running' })]);
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });

    const { findByText } = render(JobQueue);
    await fireEvent.click(await findByText('Pause'));
    await new Promise((r) => setTimeout(r, 5));
    expect(get(toasts).some((t) => t.level === 'error' && t.message === 'boom')).toBe(true);
  });

  it('completed job shows runtime in seconds (not the "running since" placeholder)', async () => {
    jobService.jobsStore.set([
      buildJob({ id: 'done', status: 'completed', progress: 100, runtimeMs: 2500 })
    ]);
    const { container } = render(JobQueue);
    expect(container.textContent).toContain('completed');
    expect(container.textContent).toContain('2.5s');
    expect(container.textContent).not.toMatch(/running since/);
  });

  it('renders errorMessage when the job failed', async () => {
    jobService.jobsStore.set([
      buildJob({ id: 'f1', status: 'failed', progress: 30, errorMessage: 'worker crashed' })
    ]);
    const { container } = render(JobQueue);
    expect(container.textContent).toContain('worker crashed');
  });
});
