<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '../components/layout/AppShell.svelte';
  import Modal from '../components/common/Modal.svelte';
  import LeadForm from '../components/leads/LeadForm.svelte';
  import LeadDrawer from '../components/leads/LeadDrawer.svelte';
  import LeadStatusBadge from '../components/leads/LeadStatusBadge.svelte';
  import { leadService } from '../services/lead.service';
  import type { Lead, LeadStatus } from '../types/lead.types';
  import type { User } from '../types/auth.types';
  import { listUsers } from '../services/auth.service';
  import { session } from '../stores/session.store';
  import { pushToast } from '../stores/toast.store';
  import { formatCurrency, formatDate } from '../utils/format';

  const STATUSES: Array<LeadStatus | ''> = ['', 'new', 'in_discussion', 'quoted', 'confirmed', 'closed'];

  let leads: Lead[] = [];
  let users: User[] = [];
  let statusFilter: LeadStatus | '' = '';
  let assigneeFilter = '';
  let searchQuery = '';
  let createOpen = false;
  let drawerOpen = false;
  let selected: Lead | null = null;
  let slaTimer: number | null = null;

  $: usernames = Object.fromEntries(users.map((u) => [u.id, u.username]));

  async function refresh() {
    leads = await leadService.listLeads({
      status: statusFilter || undefined,
      assignedTo: assigneeFilter || undefined,
      search: searchQuery || undefined
    });
  }

  async function refreshAll() {
    users = await listUsers();
    await refresh();
  }

  onMount(async () => {
    await refreshAll();
    await leadService.checkSlaFlags();
    slaTimer = window.setInterval(() => {
      void leadService.checkSlaFlags().then(refresh);
    }, 30 * 60 * 1000);
    return () => {
      if (slaTimer) window.clearInterval(slaTimer);
    };
  });

  $: if (statusFilter !== undefined || assigneeFilter !== undefined) void refresh();

  async function handleCreate(data: Parameters<typeof leadService.createLead>[0]) {
    if (!$session) return;
    await leadService.createLead(data, $session.userId);
    createOpen = false;
    pushToast('Lead created', 'success');
    await refresh();
  }

  function openDrawer(lead: Lead) {
    selected = lead;
    drawerOpen = true;
  }

  async function onDrawerChange() {
    await refresh();
    if (selected) {
      const fresh = await leadService.getLead(selected.id);
      selected = fresh ?? null;
    }
  }
</script>

<AppShell pageTitle="Lead Inbox">
  <div class="toolbar">
    <input placeholder="Search title / contact / email" bind:value={searchQuery} on:input={refresh} />
    <select bind:value={statusFilter}>
      {#each STATUSES as s}
        <option value={s}>{s === '' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
      {/each}
    </select>
    <select bind:value={assigneeFilter}>
      <option value="">All assignees</option>
      {#each users as u}
        <option value={u.id}>{u.username}</option>
      {/each}
    </select>
    <div class="spacer"></div>
    <button class="primary" on:click={() => (createOpen = true)}>+ New lead</button>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Title</th>
        <th>Status</th>
        <th>Assignee</th>
        <th>Contact</th>
        <th>Budget</th>
        <th>Updated</th>
      </tr>
    </thead>
    <tbody>
      {#each leads as l}
        <tr on:click={() => openDrawer(l)} class="row">
          <td>
            {l.title}
            {#if l.slaFlagged}<span class="sla">SLA</span>{/if}
          </td>
          <td><LeadStatusBadge status={l.status} /></td>
          <td>{usernames[l.assignedTo] ?? '—'}</td>
          <td>{l.contactName}</td>
          <td>{formatCurrency(Math.round(l.budget * 100))}</td>
          <td>{formatDate(l.updatedAt)}</td>
        </tr>
      {/each}
      {#if leads.length === 0}
        <tr><td colspan="6" class="empty">No leads match the current filters</td></tr>
      {/if}
    </tbody>
  </table>
</AppShell>

<Modal open={createOpen} title="New lead" onClose={() => (createOpen = false)}>
  <LeadForm onSubmit={handleCreate} onCancel={() => (createOpen = false)} />
</Modal>

<LeadDrawer
  open={drawerOpen}
  lead={selected}
  onClose={() => (drawerOpen = false)}
  onChange={onDrawerChange}
/>

<style>
  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .toolbar input, .toolbar select {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  .toolbar input { flex: 1; min-width: 200px; }
  .spacer { flex: 1; }
  button.primary {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
  }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
  th { background: #f7f7f7; font-weight: 600; }
  .row { cursor: pointer; }
  .row:hover td { background: #fafafa; }
  .empty { text-align: center; color: #888; padding: 24px; }
  .sla {
    background: #fee2e2;
    color: #991b1b;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 11px;
    margin-left: 6px;
  }
</style>
