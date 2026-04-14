<script lang="ts">
  import { onMount } from 'svelte';
  import Drawer from '../common/Drawer.svelte';
  import type { Delivery, DeliveryException, DeliveryPod, ExceptionType } from '../../types/delivery.types';
  import { deliveryService } from '../../services/delivery.service';
  import { session } from '../../stores/session.store';
  import { pushToast } from '../../stores/toast.store';
  import { formatCurrency, formatDate } from '../../utils/format';

  export let open = false;
  export let delivery: Delivery | null = null;
  export let onClose: () => void = () => {};
  export let onChange: () => void = () => {};

  const slots = deliveryService.getAvailableSlots();
  let date = '';
  let slot = '';
  let pods: DeliveryPod[] = [];
  let exceptions: DeliveryException[] = [];

  let podSignature = '';
  let photoBase64 = '';
  let photoError = '';

  let exceptionType: ExceptionType = 'reschedule';
  let exceptionReason = '';
  let adapterStatus: { status?: string; externalId?: string; success?: boolean } | null = null;

  $: if (delivery && open) {
    date = delivery.scheduledDate || new Date().toISOString().slice(0, 10);
    slot = delivery.scheduledSlot || slots[0];
    void loadChildren(delivery.id);
  }

  async function loadChildren(id: string) {
    pods = await deliveryService.listPods(id);
    exceptions = await deliveryService.listExceptions(id);
  }

  async function submitSchedule() {
    if (!delivery || !$session) return;
    try {
      await deliveryService.scheduleDelivery(delivery.id, date, slot, $session.userId);
      pushToast('Delivery scheduled', 'success');
      onChange();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  async function syncAdapterStatus() {
    if (!delivery || !$session) return;
    try {
      const res = await deliveryService.fetchDeliveryStatus(delivery.id, $session.userId);
      adapterStatus = res.adapter;
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  async function cancelThisDelivery() {
    if (!delivery || !$session) return;
    if (!confirm('Cancel this delivery? This also records a cancelDelivery call in the adapter queue.')) return;
    try {
      await deliveryService.cancelDelivery(delivery.id, $session.userId);
      pushToast('Delivery cancelled', 'info');
      onChange();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  async function handleFile(e: Event) {
    photoError = '';
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      photoError = 'Photo must be under 2 MB';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      photoBase64 = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  async function submitPod() {
    if (!delivery || !$session) return;
    try {
      await deliveryService.capturePod(
        delivery.id,
        { signatureName: podSignature, photoBase64: photoBase64 || undefined },
        $session.userId
      );
      podSignature = '';
      photoBase64 = '';
      pushToast('POD captured', 'success');
      await loadChildren(delivery.id);
      onChange();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  async function submitException() {
    if (!delivery || !$session) return;
    try {
      await deliveryService.logException(
        delivery.id,
        { type: exceptionType, reason: exceptionReason },
        $session.userId
      );
      exceptionReason = '';
      pushToast('Exception logged', 'success');
      await loadChildren(delivery.id);
      onChange();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }
</script>

<Drawer open={open} title={delivery ? `Delivery ${delivery.id.slice(0, 8)}` : ''} onClose={onClose}>
  {#if delivery}
    <dl>
      <dt>Recipient</dt>
      <dd>{delivery.recipientName}<br />{delivery.recipientAddress}<br />ZIP {delivery.recipientZip}</dd>
      <dt>Status</dt><dd>{delivery.status}</dd>
      <dt>Distance</dt><dd>{delivery.distanceMiles.toFixed(1)} mi</dd>
      <dt>Freight</dt><dd>{formatCurrency(delivery.freightCost)}{delivery.hasOversizeItem ? ' (includes oversize surcharge)' : ''}</dd>
      <dt>Driver</dt><dd>{delivery.assignedDriver || '—'}</dd>
      <dt>Scheduled</dt><dd>{delivery.scheduledDate || '—'} {delivery.scheduledSlot}</dd>
    </dl>

    <section>
      <h4>Schedule</h4>
      <div class="row">
        <input type="date" bind:value={date} />
        <select bind:value={slot}>
          {#each slots as s}<option value={s}>{s}</option>{/each}
        </select>
        <button on:click={submitSchedule}>Save slot</button>
        <button on:click={syncAdapterStatus} data-testid="sync-adapter-btn">Sync adapter status</button>
        <button on:click={cancelThisDelivery} class="danger">Cancel delivery</button>
      </div>
      {#if adapterStatus}
        <div class="adapter-status" data-testid="adapter-status">
          Adapter (offline stub): {adapterStatus.status ?? 'unknown'}
          {#if adapterStatus.externalId}· {adapterStatus.externalId}{/if}
        </div>
      {/if}
    </section>

    <section>
      <h4>Proof of delivery</h4>
      <input placeholder="Signature name" bind:value={podSignature} />
      <input type="file" accept="image/*" on:change={handleFile} />
      {#if photoError}<div class="error">{photoError}</div>{/if}
      {#if photoBase64}<img alt="preview" src={photoBase64} class="preview" />{/if}
      <button on:click={submitPod} disabled={!podSignature}>Capture POD</button>
      {#if pods.length > 0}
        <ul>
          {#each pods as p}
            <li>
              Signed by <strong>{p.signatureName}</strong> on {formatDate(p.timestamp)}
              {#if p.photoBase64}<img alt="pod" src={p.photoBase64} class="thumb" />{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h4>Exception</h4>
      <div class="row">
        <select bind:value={exceptionType}>
          <option value="reschedule">Reschedule</option>
          <option value="refused">Refused</option>
          <option value="loss_damage">Loss / damage</option>
        </select>
        <input placeholder="Reason" bind:value={exceptionReason} />
        <button on:click={submitException} disabled={!exceptionReason}>Log</button>
      </div>
      {#if exceptions.length > 0}
        <ul>
          {#each exceptions as x}
            <li>[{x.type}] {x.reason} — {formatDate(x.timestamp)}</li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</Drawer>

<style>
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 16px; }
  dt { font-weight: 600; color: #555; font-size: 13px; }
  dd { margin: 0; font-size: 14px; }
  section { margin-bottom: 16px; }
  section h4 { margin: 0 0 6px; font-size: 14px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .row input, .row select { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; }
  button { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  ul { list-style: none; margin: 8px 0 0; padding: 0; }
  ul li { font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eee; }
  .thumb, .preview { max-width: 120px; border-radius: 4px; display: block; margin-top: 4px; }
  .error { color: #991b1b; font-size: 12px; }
  .adapter-status { font-size: 12px; color: #374151; margin-top: 6px; }
  button.danger { background: #b91c1c; }
</style>
