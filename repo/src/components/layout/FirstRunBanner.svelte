<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from '../common/Modal.svelte';
  import { changePassword } from '../../services/auth.service';
  import { lsGet, lsSet, LS_KEYS } from '../../utils/local-storage';
  import { session } from '../../stores/session.store';
  import { pushToast } from '../../stores/toast.store';

  let dismissed = lsGet<boolean>(LS_KEYS.FIRST_RUN_BANNER_DISMISSED) === true;
  let open = false;
  let current = '';
  let next = '';
  let confirm = '';
  let error = '';

  $: show = !dismissed && $session?.username === 'admin';

  function dismiss() {
    lsSet(LS_KEYS.FIRST_RUN_BANNER_DISMISSED, true);
    dismissed = true;
  }

  async function submit() {
    error = '';
    if (!$session) return;
    if (next !== confirm) { error = 'Passwords do not match'; return; }
    if (next.length < 8) { error = 'Password must be at least 8 characters'; return; }
    try {
      await changePassword($session.userId, current, next);
      open = false;
      dismiss();
      pushToast('Password changed', 'success');
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

{#if show}
  <div class="banner" role="alert">
    <span>First-run: change the default admin password.</span>
    <div class="spacer"></div>
    <button on:click={() => (open = true)}>Change now</button>
    <button class="link" on:click={dismiss}>Dismiss</button>
  </div>
{/if}

<Modal open={open} title="Change admin password" onClose={() => (open = false)}>
  <form on:submit|preventDefault={submit} class="form">
    <label>Current password<input type="password" bind:value={current} required /></label>
    <label>New password<input type="password" bind:value={next} minlength="8" required /></label>
    <label>Confirm password<input type="password" bind:value={confirm} minlength="8" required /></label>
    {#if error}<div class="error">{error}</div>{/if}
    <div class="actions">
      <button type="button" on:click={() => (open = false)}>Cancel</button>
      <button type="submit" class="primary">Update</button>
    </div>
  </form>
</Modal>

<style>
  .banner {
    background: #fef3c7;
    color: #78350f;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #fcd34d;
    font-size: 14px;
  }
  .spacer { flex: 1; }
  button {
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid #b45309;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
  }
  button.link { background: transparent; border: none; color: #78350f; }
  .form { display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .form input {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .error { color: #991b1b; font-size: 13px; }
</style>
