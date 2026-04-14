<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '../components/layout/AppShell.svelte';
  import Modal from '../components/common/Modal.svelte';
  import { listUsers, register, updateUser } from '../services/auth.service';
  import type { User, UserRole } from '../types/auth.types';
  import { session } from '../stores/session.store';
  import { pushToast } from '../stores/toast.store';
  import { formatDate } from '../utils/format';

  const ROLES: UserRole[] = [
    'administrator',
    'sales_coordinator',
    'planner',
    'dispatcher',
    'auditor'
  ];

  let users: User[] = [];
  let createOpen = false;
  let editOpen = false;
  let editing: User | null = null;
  let newUser = { username: '', password: '', role: 'sales_coordinator' as UserRole };
  let editRole: UserRole = 'sales_coordinator';
  let editActive = true;
  let error = '';

  async function refresh() {
    users = (await listUsers()).sort((a, b) => a.username.localeCompare(b.username));
  }

  onMount(refresh);

  async function submitCreate() {
    error = '';
    if (!$session) return;
    try {
      await register(newUser.username.trim(), newUser.password, newUser.role, $session.userId);
      createOpen = false;
      newUser = { username: '', password: '', role: 'sales_coordinator' };
      await refresh();
      pushToast('User created', 'success');
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function openEdit(u: User) {
    editing = u;
    editRole = u.role;
    editActive = u.isActive;
    editOpen = true;
    error = '';
  }

  async function submitEdit() {
    if (!editing || !$session) return;
    try {
      await updateUser(editing.id, { role: editRole, isActive: editActive }, $session.userId);
      editOpen = false;
      editing = null;
      await refresh();
      pushToast('User updated', 'success');
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<AppShell pageTitle="Users">
  <div class="head">
    <button on:click={() => { createOpen = true; error = ''; }}>+ Add user</button>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Username</th>
        <th>Role</th>
        <th>Active</th>
        <th>Created</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each users as u}
        <tr>
          <td>{u.username}</td>
          <td>{u.role.replace(/_/g, ' ')}</td>
          <td>{u.isActive ? 'Yes' : 'No'}</td>
          <td>{formatDate(u.createdAt)}</td>
          <td><button class="link" on:click={() => openEdit(u)}>Edit</button></td>
        </tr>
      {/each}
      {#if users.length === 0}
        <tr><td colspan="5" class="empty">No users yet</td></tr>
      {/if}
    </tbody>
  </table>
</AppShell>

<Modal open={createOpen} title="Create user" onClose={() => (createOpen = false)}>
  <form on:submit|preventDefault={submitCreate} class="form">
    <label>Username<input bind:value={newUser.username} required /></label>
    <label>Temporary password
      <input type="password" bind:value={newUser.password} minlength="8" required />
    </label>
    <label>Role
      <select bind:value={newUser.role}>
        {#each ROLES as r}
          <option value={r}>{r.replace(/_/g, ' ')}</option>
        {/each}
      </select>
    </label>
    {#if error}<div class="error">{error}</div>{/if}
    <div class="actions">
      <button type="button" on:click={() => (createOpen = false)}>Cancel</button>
      <button type="submit" class="primary">Create</button>
    </div>
  </form>
</Modal>

<Modal open={editOpen} title={editing ? `Edit ${editing.username}` : ''} onClose={() => (editOpen = false)}>
  <form on:submit|preventDefault={submitEdit} class="form">
    <label>Role
      <select bind:value={editRole}>
        {#each ROLES as r}
          <option value={r}>{r.replace(/_/g, ' ')}</option>
        {/each}
      </select>
    </label>
    <label class="checkbox">
      <input type="checkbox" bind:checked={editActive} />
      Active
    </label>
    {#if error}<div class="error">{error}</div>{/if}
    <div class="actions">
      <button type="button" on:click={() => (editOpen = false)}>Cancel</button>
      <button type="submit" class="primary">Save</button>
    </div>
  </form>
</Modal>

<style>
  .head { margin-bottom: 12px; }
  .head button {
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
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f7f7f7; font-weight: 600; }
  .empty { text-align: center; color: #888; }
  button.link {
    background: transparent;
    border: none;
    color: #2563eb;
    cursor: pointer;
    padding: 0;
  }
  .form { display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .form label.checkbox { flex-direction: row; align-items: center; gap: 8px; }
  .form input, .form select {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .actions button { padding: 8px 14px; border-radius: 4px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
  .actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .error { color: #991b1b; font-size: 13px; }
</style>
