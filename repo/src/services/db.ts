import { openDB, type IDBPDatabase } from 'idb';
import type { DbSchema, StoreName } from '../types/db.types';

export const DB_NAME = 'forgeops';
export const DB_VERSION = 2;

const STORE_DEFS: Array<{
  name: StoreName;
  keyPath?: string | string[];
  indexes?: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>;
}> = [
  { name: 'users', keyPath: 'id', indexes: [
    { name: 'by_username', keyPath: 'username', unique: true },
    { name: 'by_role', keyPath: 'role' }
  ]},
  { name: 'leads', keyPath: 'id', indexes: [
    { name: 'by_status', keyPath: 'status' },
    { name: 'by_assignedTo', keyPath: 'assignedTo' }
  ]},
  { name: 'plans', keyPath: 'id', indexes: [{ name: 'by_status', keyPath: 'status' }] },
  { name: 'plan_versions', keyPath: 'id', indexes: [{ name: 'by_plan', keyPath: 'planId' }] },
  { name: 'bom_items', keyPath: 'id', indexes: [{ name: 'by_plan', keyPath: 'planId' }] },
  { name: 'share_tokens', keyPath: 'id', indexes: [
    { name: 'by_plan', keyPath: 'planId' },
    { name: 'by_token', keyPath: 'token', unique: true }
  ]},
  { name: 'deliveries', keyPath: 'id', indexes: [
    { name: 'by_status', keyPath: 'status' },
    { name: 'by_date', keyPath: 'scheduledDate' },
    { name: 'by_zip', keyPath: 'recipientZip' }
  ]},
  { name: 'delivery_pods', keyPath: 'id', indexes: [{ name: 'by_delivery', keyPath: 'deliveryId' }] },
  { name: 'delivery_exceptions', keyPath: 'id', indexes: [{ name: 'by_delivery', keyPath: 'deliveryId' }] },
  { name: 'delivery_api_queue', keyPath: 'id' },
  { name: 'depots', keyPath: 'id' },
  { name: 'ledger_accounts', keyPath: 'id', indexes: [{ name: 'by_reference', keyPath: 'referenceId' }] },
  { name: 'ledger_entries', keyPath: 'id', indexes: [{ name: 'by_account', keyPath: 'accountId' }] },
  { name: 'notifications', keyPath: 'id', indexes: [
    { name: 'by_recipient', keyPath: 'recipientId' },
    { name: 'by_status', keyPath: 'status' }
  ]},
  { name: 'notification_reads', keyPath: 'id', indexes: [
    { name: 'by_user', keyPath: 'userId' },
    { name: 'by_notification', keyPath: 'notificationId' },
    { name: 'by_user_notification', keyPath: ['userId', 'notificationId'], unique: true }
  ]},
  { name: 'notification_subscriptions', keyPath: ['userId', 'eventType'] },
  { name: 'notification_dnd', keyPath: 'userId' },
  { name: 'jobs', keyPath: 'id', indexes: [{ name: 'by_status', keyPath: 'status' }] },
  { name: 'job_inputs', keyPath: 'id' },
  { name: 'job_results', keyPath: 'id' },
  { name: 'job_checkpoints', keyPath: 'jobId' },
  { name: 'audit_log', keyPath: 'id', indexes: [
    { name: 'by_timestamp', keyPath: 'timestamp' },
    { name: 'by_actor', keyPath: 'actor' },
    { name: 'by_action', keyPath: 'action' },
    { name: 'by_resourceType', keyPath: 'resourceType' }
  ]}
];

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function __resetForTests(): Promise<void> {
  // Clear every store via fully-committed transactions *before* closing.
  // Tests then get a guaranteed-empty DB regardless of whether the
  // follow-up indexedDB.deleteDatabase() actually completes (fake-indexeddb
  // often fires onblocked and returns without deleting, leaving data from
  // the previous test — which caused ensureFirstRunSeed to silently report
  // seeded:false and every "render seeded data" test to see empty stores).
  if (dbPromise) {
    try {
      const db = await dbPromise;
      for (const def of STORE_DEFS) {
        if (db.objectStoreNames.contains(def.name)) {
          try {
            const tx = db.transaction(def.name, 'readwrite');
            await tx.store.clear();
            await tx.done;
          } catch {
            /* store may be gone mid-teardown; ignore */
          }
        }
      }
      db.close();
    } catch {
      /* noop */
    }
  }
  dbPromise = null;
}

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const def of STORE_DEFS) {
          if (!db.objectStoreNames.contains(def.name)) {
            const store = db.createObjectStore(def.name, {
              keyPath: def.keyPath as IDBValidKey
            });
            for (const idx of def.indexes ?? []) {
              store.createIndex(idx.name, idx.keyPath as IDBValidKey, {
                unique: idx.unique ?? false
              });
            }
          }
        }
      }
    });
  }
  return dbPromise;
}

// If the DB connection is closed mid-operation (e.g. a component unmounts
// mid-flight because a new test's beforeEach reset the DB), idb rejects
// the pending request with an AbortError. That's not a correctness
// failure — the caller has been torn down and can't act on the result.
// Rethrow anything else so real errors still surface.
function isAbort(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name;
  return name === 'AbortError' || name === 'InvalidStateError';
}

export async function put<T extends StoreName>(store: T, value: DbSchema[T]): Promise<void> {
  const db = await getDb();
  // Use explicit tx + tx.done so the write is fully committed before we
  // return. `db.put(...)` only awaits the request; in fake-indexeddb the
  // tx can commit in a later tick, so a subsequent read from a different
  // transaction may not see the write yet.
  // Writes must NOT swallow AbortError — a failed persist is a real error.
  const tx = db.transaction(store, 'readwrite');
  await tx.store.put(value as never);
  await tx.done;
}

// Use explicit transactions for reads so tx.done's promise is awaited
// within a try/catch. The shorthand `db.getAll(store)` implicitly creates
// a transaction whose `tx.done` is never awaited — if it aborts (e.g. a
// torn-down component's onMount had a read in flight), that promise
// rejects in a detached context and surfaces as an unhandled rejection.
async function runRead<R>(
  db: IDBPDatabase,
  store: StoreName,
  fn: (tx: ReturnType<IDBPDatabase['transaction']>) => Promise<R>,
  fallback: R
): Promise<R> {
  try {
    const tx = db.transaction(store, 'readonly');
    const value = await fn(tx);
    await tx.done;
    return value;
  } catch (e) {
    if (isAbort(e)) return fallback;
    throw e;
  }
}

export async function get<T extends StoreName>(
  store: T,
  key: IDBValidKey
): Promise<DbSchema[T] | undefined> {
  const db = await getDb();
  return runRead(
    db, store,
    (tx) => tx.objectStore(store).get(key) as Promise<DbSchema[T] | undefined>,
    undefined
  );
}

export async function getAll<T extends StoreName>(store: T): Promise<DbSchema[T][]> {
  const db = await getDb();
  return runRead(
    db, store,
    (tx) => tx.objectStore(store).getAll() as Promise<DbSchema[T][]>,
    [] as DbSchema[T][]
  );
}

export async function getAllByIndex<T extends StoreName>(
  store: T,
  index: string,
  key: IDBValidKey | IDBKeyRange
): Promise<DbSchema[T][]> {
  const db = await getDb();
  return runRead(
    db, store,
    (tx) => tx.objectStore(store).index(index).getAll(key) as Promise<DbSchema[T][]>,
    [] as DbSchema[T][]
  );
}

export async function getByIndex<T extends StoreName>(
  store: T,
  index: string,
  key: IDBValidKey
): Promise<DbSchema[T] | undefined> {
  const db = await getDb();
  return runRead(
    db, store,
    (tx) => tx.objectStore(store).index(index).get(key) as Promise<DbSchema[T] | undefined>,
    undefined
  );
}

export async function del(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await getDb();
  // Writes must NOT swallow AbortError — a failed delete is a real error.
  const tx = db.transaction(store, 'readwrite');
  await tx.store.delete(key);
  await tx.done;
}

export async function clear(store: StoreName): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(store, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  // Use explicit tx + await tx.done so each clear fully commits before the
  // next. `db.clear(store)` only awaits the request, not the transaction,
  // which means a later `put` can race with an unfinished clear tx and
  // observe "stale" state (the data written ends up in a to-be-cleared
  // store). That was the cause of tests seeing "No X" even after seeding.
  for (const def of STORE_DEFS) {
    const tx = db.transaction(def.name, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

export const ALL_STORES: StoreName[] = STORE_DEFS.map((d) => d.name);
