import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../../src/services/db';
import {
  dispatch,
  getRetryQueue,
  retry,
  listNotifications,
  updateDndSettings
} from '../../src/services/notification.service';
import { ensureFirstRunSeed, listUsers } from '../../src/services/auth.service';
import { clearSession } from '../../src/stores/session.store';

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

describe('notification failure + retry', () => {
  beforeEach(async () => {
    await freshDb();
    await ensureFirstRunSeed();
  });

  it('unknown event type dispatches as failed (not silently defaulted)', async () => {
    const [admin] = await listUsers();
    const n = await dispatch('not_a_real_template', admin.id, { foo: 'bar' });
    expect(n.status).toBe('failed');
    expect(n.dispatchedAt).toBeNull();
  });

  it('missing recipient id produces a failed notification', async () => {
    const n = await dispatch('lead_status_default', '', { leadTitle: 'X' });
    expect(n.status).toBe('failed');
  });

  it('retry is RBAC-gated', async () => {
    const [admin] = await listUsers();
    const { register } = await import('../../src/services/auth.service');
    const auditor = await register('aud1', 'passw0rd!', 'auditor', admin.id);
    const n = await dispatch('lead_status_default', admin.id, { leadTitle: 'X' });
    await expect(retry(n.id, auditor.id)).rejects.toThrow(/not permitted|Unauthorized/i);
  });

  it('failed notifications appear in retry queue', async () => {
    const [admin] = await listUsers();
    await dispatch('not_a_real_template', admin.id, {});
    const q = await getRetryQueue(admin.id);
    expect(q.some((n) => n.status === 'failed')).toBe(true);
  });

  it('retry on an unknown-template notification stays failed (no fake success)', async () => {
    const [admin] = await listUsers();
    const n = await dispatch('not_a_real_template', admin.id, {});
    expect(n.status).toBe('failed');
    await retry(n.id);
    const list = await listNotifications(admin.id);
    const updated = list.find((x) => x.id === n.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.retryCount).toBe(1);
  });

  it('retry transitions a DND-queued (valid) notification correctly', async () => {
    const [admin] = await listUsers();
    const now = new Date();
    await updateDndSettings(admin.id, {
      userId: admin.id,
      startHour: now.getHours(),
      startMinute: 0,
      endHour: (now.getHours() + 1) % 24,
      endMinute: 0,
      enabled: true
    });
    const n = await dispatch('lead_status_default', admin.id, { leadTitle: 'Q' });
    expect(n.status).toBe('queued');
    await retry(n.id);
    let list = await listNotifications(admin.id);
    let updated = list.find((x) => x.id === n.id);
    // Still in DND window → stays queued, count bumped
    expect(updated?.status).toBe('queued');
    expect(updated?.retryCount).toBe(1);

    // Leave DND and retry — should now dispatch
    await updateDndSettings(admin.id, {
      userId: admin.id,
      startHour: 0, startMinute: 0, endHour: 0, endMinute: 0, enabled: false
    });
    await retry(n.id);
    list = await listNotifications(admin.id);
    updated = list.find((x) => x.id === n.id);
    expect(updated?.status).toBe('dispatched');
    expect(updated?.retryCount).toBe(2);
  });
});
