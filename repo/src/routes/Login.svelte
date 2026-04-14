<script lang="ts">
  import { onMount } from 'svelte';
  import { login, ensureFirstRunSeed, getRecentFailedLoginCount } from '../services/auth.service';
  import { navigate } from '../router';
  import { defaultRouteFor } from '../guards/route-guard';
  import { pushToast } from '../stores/toast.store';
  import { session } from '../stores/session.store';

  let username = '';
  let password = '';
  let loading = false;
  let error = '';
  let seeded = false;
  let anomaly = false;
  let cooldown = 0;
  let cooldownTimer: number | null = null;

  onMount(async () => {
    const res = await ensureFirstRunSeed();
    seeded = res.seeded;
    refreshAnomaly();
  });

  function refreshAnomaly() {
    const count = getRecentFailedLoginCount();
    anomaly = count > 10;
    if (anomaly && cooldown === 0) {
      cooldown = 60;
      cooldownTimer = window.setInterval(() => {
        cooldown--;
        if (cooldown <= 0) {
          cooldown = 0;
          anomaly = false;
          if (cooldownTimer) window.clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
      }, 1000);
    }
  }

  async function handleSubmit() {
    error = '';
    if (cooldown > 0) return;
    if (!username || !password) {
      error = 'Username and password are required';
      return;
    }
    loading = true;
    try {
      await login(username.trim(), password);
      pushToast('Welcome back', 'success');
      navigate(defaultRouteFor($session?.role ?? null));
    } catch (e) {
      error = (e as Error).message;
      refreshAnomaly();
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-wrap">
  <form class="login-card" on:submit|preventDefault={handleSubmit}>
    <h1>ForgeOps</h1>
    <p class="subtitle">Fulfillment &amp; Planning Console</p>

    {#if seeded}
      <div class="notice">
        First-run setup complete. Default admin credentials:
        <code>admin / Admin@12345</code>. Change the password after signing in.
      </div>
    {/if}

    {#if anomaly}
      <div class="anomaly">
        Too many failed attempts detected. Sign-in disabled for {cooldown}s.
      </div>
    {/if}

    <label>
      Username
      <input bind:value={username} autocomplete="username" disabled={loading || cooldown > 0} />
    </label>

    <label>
      Password
      <input
        type="password"
        bind:value={password}
        autocomplete="current-password"
        disabled={loading || cooldown > 0}
      />
    </label>

    {#if error}
      <div class="error" role="alert">{error}</div>
    {/if}

    <button type="submit" disabled={loading || cooldown > 0}>
      {loading ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
  }
  .login-card {
    background: #fff;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
    width: min(380px, 90vw);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h1 { margin: 0; font-size: 22px; }
  .subtitle { margin: 0 0 8px; color: #555; font-size: 14px; }
  .notice {
    background: #eff6ff;
    border-left: 3px solid #2563eb;
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 4px;
  }
  .notice code { background: #dbeafe; padding: 2px 4px; border-radius: 3px; }
  .anomaly {
    background: #fef2f2;
    color: #991b1b;
    border-left: 3px solid #dc2626;
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 4px;
  }
  label {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    gap: 4px;
  }
  input {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
  }
  button {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  button:hover:not(:disabled) { background: #1d4ed8; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  .error {
    color: #991b1b;
    font-size: 13px;
    background: #fef2f2;
    padding: 8px 10px;
    border-radius: 4px;
  }
</style>
