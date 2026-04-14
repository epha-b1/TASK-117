<script lang="ts">
  import { onMount } from 'svelte';
  import type { DndSettings } from '../../types/notification.types';
  import { notificationService } from '../../services/notification.service';
  import { session } from '../../stores/session.store';
  import { pushToast } from '../../stores/toast.store';

  let settings: DndSettings | null = null;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 30];

  onMount(async () => {
    if (!$session) return;
    settings = await notificationService.getDndSettings($session.userId);
  });

  async function save() {
    if (!settings || !$session) return;
    await notificationService.updateDndSettings($session.userId, settings);
    pushToast('DND saved', 'success');
  }
</script>

{#if settings}
  <div class="dnd">
    <label class="check">
      <input type="checkbox" bind:checked={settings.enabled} />
      Enable Do Not Disturb
    </label>
    <div class="row">
      <span>From</span>
      <select bind:value={settings.startHour}>
        {#each hours as h}<option value={h}>{h.toString().padStart(2, '0')}</option>{/each}
      </select>
      <select bind:value={settings.startMinute}>
        {#each minutes as m}<option value={m}>{m.toString().padStart(2, '0')}</option>{/each}
      </select>
      <span>to</span>
      <select bind:value={settings.endHour}>
        {#each hours as h}<option value={h}>{h.toString().padStart(2, '0')}</option>{/each}
      </select>
      <select bind:value={settings.endMinute}>
        {#each minutes as m}<option value={m}>{m.toString().padStart(2, '0')}</option>{/each}
      </select>
      <button on:click={save}>Save</button>
    </div>
  </div>
{/if}

<style>
  .dnd { display: flex; flex-direction: column; gap: 8px; background: #f9fafb; padding: 12px; border-radius: 6px; }
  .check { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .row { display: flex; gap: 6px; align-items: center; font-size: 13px; flex-wrap: wrap; }
  select { padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 4px; }
  button { padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
</style>
