import { diffBom } from '../utils/bom-diff';
import type { BomItem } from '../types/plan.types';
import type { MainToWorker, WorkerToMain, WorkerCheckpoint } from './protocol';

interface Input {
  a: BomItem[];
  b: BomItem[];
}

const state: Record<string, { paused: boolean; cancelled: boolean }> = {};

function post(msg: WorkerToMain) {
  (self as unknown as Worker).postMessage(msg);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(
  jobId: string,
  input: Input,
  checkpoint?: WorkerCheckpoint
): Promise<void> {
  const local = state[jobId] ?? (state[jobId] = { paused: false, cancelled: false });
  const total = Math.max(1, input.a.length + input.b.length);
  const chunkSize = Math.max(1, Math.floor(total / 10));
  const aChunks: BomItem[][] = [];
  const bChunks: BomItem[][] = [];
  for (let i = 0; i < input.a.length; i += chunkSize) aChunks.push(input.a.slice(i, i + chunkSize));
  for (let i = 0; i < input.b.length; i += chunkSize) bChunks.push(input.b.slice(i, i + chunkSize));
  const chunkCount = Math.max(aChunks.length, bChunks.length);

  let startChunk = checkpoint?.index ?? 0;
  if (startChunk > chunkCount) startChunk = chunkCount;
  let processed = 0;
  for (let k = 0; k < startChunk; k++) {
    processed += (aChunks[k]?.length ?? 0) + (bChunks[k]?.length ?? 0);
  }

  for (let i = startChunk; i < chunkCount; i++) {
    while (local.paused && !local.cancelled) {
      post({
        jobId,
        kind: 'checkpoint',
        progress: Math.min(99, Math.round((processed / total) * 100)),
        index: i,
        partial: { processed }
      });
      post({ jobId, kind: 'paused' });
      await sleep(50);
    }
    if (local.cancelled) return;
    processed += (aChunks[i]?.length ?? 0) + (bChunks[i]?.length ?? 0);
    const progress = Math.min(99, Math.round((processed / total) * 100));
    post({ jobId, kind: 'progress', progress });
    post({
      jobId,
      kind: 'checkpoint',
      progress,
      index: i + 1,
      partial: { processed }
    });
    await sleep(20);
  }
  const result = diffBom(input.a, input.b);
  post({ jobId, kind: 'progress', progress: 100 });
  post({ jobId, kind: 'complete', result });
  delete state[jobId];
}

self.addEventListener('message', (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  if (msg.cmd === 'start') {
    state[msg.jobId] = { paused: false, cancelled: false };
    run(msg.jobId, msg.input as Input, msg.checkpoint).catch((err) => {
      post({ jobId: msg.jobId, kind: 'error', message: (err as Error).message });
    });
  } else if (msg.cmd === 'pause') {
    const s = state[msg.jobId];
    if (s) s.paused = true;
  } else if (msg.cmd === 'resume') {
    const s = state[msg.jobId];
    if (s) {
      s.paused = false;
      post({ jobId: msg.jobId, kind: 'resumed' });
    }
  } else if (msg.cmd === 'cancel') {
    const s = state[msg.jobId];
    if (s) s.cancelled = true;
  }
});
