<script lang="ts">
  import Drawer from '../common/Drawer.svelte';
  import LeadStatusBadge from './LeadStatusBadge.svelte';
  import type { Lead, LeadStatus } from '../../types/lead.types';
  import { leadService } from '../../services/lead.service';
  import { session } from '../../stores/session.store';
  import { pushToast } from '../../stores/toast.store';
  import { formatCurrency, formatDate } from '../../utils/format';

  export let open = false;
  export let lead: Lead | null = null;
  export let onClose: () => void = () => {};
  export let onChange: () => void = () => {};

  let transitionNote = '';

  $: allowed = lead ? leadService.STATUS_FLOW[lead.status] : [];

  async function transition(to: LeadStatus) {
    if (!lead || !$session) return;
    try {
      await leadService.transitionStatus(lead.id, to, $session.userId, transitionNote);
      transitionNote = '';
      pushToast(`Lead moved to ${to.replace(/_/g, ' ')}`, 'success');
      onChange();
      onClose();
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }
</script>

<Drawer open={open} title={lead ? lead.title : 'Lead'} onClose={onClose}>
  {#if lead}
    <div class="summary">
      <LeadStatusBadge status={lead.status} />
      {#if lead.slaFlagged}
        <span class="sla">SLA overdue</span>
      {/if}
    </div>
    <dl>
      <dt>Budget</dt><dd>{formatCurrency(Math.round(lead.budget * 100))}</dd>
      <dt>Availability</dt>
      <dd>{formatDate(lead.availabilityStart)} → {formatDate(lead.availabilityEnd)}</dd>
      <dt>Contact</dt>
      <dd>{lead.contactName}<br />{lead.contactPhone}<br />{lead.contactEmail}</dd>
      <dt>Requirements</dt>
      <dd class="wrap">{lead.requirements}</dd>
    </dl>

    {#if allowed.length > 0}
      <section class="transition">
        <h4>Move to next status</h4>
        <textarea bind:value={transitionNote} rows="2" placeholder="Optional note" />
        <div class="actions">
          {#each allowed as next}
            <button on:click={() => transition(next)}>{next.replace(/_/g, ' ')}</button>
          {/each}
        </div>
      </section>
    {/if}

    <section class="history">
      <h4>History</h4>
      <ul>
        {#each lead.history as h}
          <li>
            <time>{formatDate(h.timestamp)}</time>
            <div>
              {#if h.fromStatus}
                {h.fromStatus.replace(/_/g, ' ')} → {h.toStatus?.replace(/_/g, ' ') ?? ''}
              {:else}
                Created
              {/if}
              {#if h.note}<div class="note">{h.note}</div>{/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</Drawer>

<style>
  .summary { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .sla {
    background: #fee2e2;
    color: #991b1b;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
  }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 16px; }
  dt { font-weight: 600; color: #555; font-size: 13px; }
  dd { margin: 0; font-size: 14px; }
  .wrap { white-space: pre-wrap; }
  .transition { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
  .transition textarea {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
  }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .actions button {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    text-transform: capitalize;
  }
  .history h4 { margin: 0 0 8px; font-size: 14px; }
  .history ul { list-style: none; margin: 0; padding: 0; }
  .history li { display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
  .history time { color: #555; }
  .note { color: #666; font-size: 12px; margin-top: 2px; }
</style>
