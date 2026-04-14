<script lang="ts">
  import { onMount } from 'svelte';
  import type { DeliveryItem, Depot } from '../../types/delivery.types';
  import { deliveryService } from '../../services/delivery.service';
  import { uid } from '../../utils/uid';

  export let onSubmit: (data: {
    recipientName: string;
    recipientAddress: string;
    recipientZip: string;
    depotId: string;
    items: DeliveryItem[];
    assignedDriver?: string;
  }) => Promise<void> | void;
  export let onCancel: () => void = () => {};

  let depots: Depot[] = [];
  let recipientName = '';
  let recipientAddress = '';
  let recipientZip = '';
  let depotId = '';
  let assignedDriver = '';
  let items: DeliveryItem[] = [
    { id: uid(), description: '', length: undefined, quantity: 1 }
  ];
  let error = '';
  let submitting = false;

  onMount(async () => {
    depots = await deliveryService.listDepots();
    if (depots.length > 0) depotId = depots[0].id;
  });

  function addItem() {
    items = [...items, { id: uid(), description: '', length: undefined, quantity: 1 }];
  }

  function removeItem(id: string) {
    items = items.filter((i) => i.id !== id);
  }

  async function submit() {
    error = '';
    if (!recipientName || !recipientAddress || !recipientZip || !depotId) {
      error = 'All recipient fields are required';
      return;
    }
    if (items.some((i) => !i.description || i.quantity <= 0)) {
      error = 'Each item needs description and quantity';
      return;
    }
    submitting = true;
    try {
      await onSubmit({
        recipientName,
        recipientAddress,
        recipientZip,
        depotId,
        items,
        assignedDriver: assignedDriver || undefined
      });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      submitting = false;
    }
  }
</script>

<form on:submit|preventDefault={submit} class="form">
  <label>Recipient name<input bind:value={recipientName} required /></label>
  <label>Address<input bind:value={recipientAddress} required /></label>
  <label>ZIP<input bind:value={recipientZip} required /></label>
  <label>Depot
    <select bind:value={depotId}>
      {#each depots as d}<option value={d.id}>{d.name}</option>{/each}
    </select>
  </label>
  <label>Assigned driver (optional)<input bind:value={assignedDriver} /></label>

  <h4>Items</h4>
  {#each items as item (item.id)}
    <div class="item-row">
      <input placeholder="Description" bind:value={item.description} />
      <input type="number" min="1" placeholder="Qty" bind:value={item.quantity} />
      <input type="number" min="0" step="0.1" placeholder="Length (ft)" bind:value={item.length} />
      <button type="button" on:click={() => removeItem(item.id)}>×</button>
    </div>
  {/each}
  <button type="button" on:click={addItem} class="link">+ Add item</button>

  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <button type="button" on:click={onCancel} disabled={submitting}>Cancel</button>
    <button type="submit" class="primary" disabled={submitting}>
      {submitting ? 'Saving…' : 'Create delivery'}
    </button>
  </div>
</form>

<style>
  .form { display: flex; flex-direction: column; gap: 8px; min-width: 400px; }
  .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .form input, .form select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-family: inherit; }
  h4 { margin: 8px 0 4px; font-size: 14px; }
  .item-row { display: grid; grid-template-columns: 2fr 70px 100px 32px; gap: 6px; }
  .item-row input { font-size: 13px; padding: 6px 8px; }
  .item-row button { background: transparent; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; }
  button.link { background: transparent; border: none; color: #2563eb; cursor: pointer; align-self: flex-start; font-size: 13px; }
  .error { color: #991b1b; font-size: 13px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  .actions button { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
  .actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
</style>
