<script lang="ts">
  import type { CreateLeadInput } from '../../types/lead.types';
  export let initial: Partial<CreateLeadInput> = {};
  export let onSubmit: (data: CreateLeadInput) => Promise<void> | void;
  export let onCancel: () => void = () => {};

  let title = initial.title ?? '';
  let requirements = initial.requirements ?? '';
  let budget: number | string = initial.budget ?? '';
  let availabilityStart = initial.availabilityStart
    ? new Date(initial.availabilityStart).toISOString().slice(0, 10)
    : '';
  let availabilityEnd = initial.availabilityEnd
    ? new Date(initial.availabilityEnd).toISOString().slice(0, 10)
    : '';
  let contactName = initial.contactName ?? '';
  let contactPhone = initial.contactPhone ?? '';
  let contactEmail = initial.contactEmail ?? '';
  let error = '';
  let submitting = false;

  async function submit() {
    error = '';
    if (!title || !requirements || !contactName || !contactPhone || !contactEmail) {
      error = 'All fields are required';
      return;
    }
    if (!availabilityStart || !availabilityEnd) {
      error = 'Availability window is required';
      return;
    }
    submitting = true;
    try {
      await onSubmit({
        title,
        requirements,
        budget: Number(budget),
        availabilityStart: new Date(availabilityStart).getTime(),
        availabilityEnd: new Date(availabilityEnd).getTime(),
        contactName,
        contactPhone,
        contactEmail
      });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      submitting = false;
    }
  }
</script>

<form on:submit|preventDefault={submit} class="lead-form">
  <label>Title<input bind:value={title} required /></label>
  <label>Requirements<textarea bind:value={requirements} rows="3" required /></label>
  <label>Budget ($)<input type="number" min="0" step="0.01" bind:value={budget} required /></label>
  <div class="row">
    <label>Availability start<input type="date" bind:value={availabilityStart} required /></label>
    <label>Availability end<input type="date" bind:value={availabilityEnd} required /></label>
  </div>
  <label>Contact name<input bind:value={contactName} required /></label>
  <label>Contact phone<input bind:value={contactPhone} required /></label>
  <label>Contact email<input type="email" bind:value={contactEmail} required /></label>
  {#if error}<div class="error">{error}</div>{/if}
  <div class="actions">
    <button type="button" on:click={onCancel} disabled={submitting}>Cancel</button>
    <button type="submit" class="primary" disabled={submitting}>
      {submitting ? 'Saving…' : 'Save'}
    </button>
  </div>
</form>

<style>
  .lead-form { display: flex; flex-direction: column; gap: 10px; min-width: 380px; }
  .lead-form label { display: flex; flex-direction: column; font-size: 13px; gap: 4px; }
  .lead-form input, .lead-form textarea {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: inherit;
  }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .error { color: #991b1b; font-size: 13px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .actions button { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
  .actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
</style>
