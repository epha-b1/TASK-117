<script lang="ts">
  import { toasts, dismissToast } from '../../stores/toast.store';
</script>

<div class="toast-wrap" aria-live="polite">
  {#each $toasts as t (t.id)}
    <div class="toast {t.level}" role="status">
      <span class="msg">{t.message}</span>
      <button class="close" on:click={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-wrap {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
  }
  .toast {
    background: var(--bg-surface, #fff);
    border: 1px solid var(--border, #ccc);
    border-left-width: 4px;
    padding: 10px 14px;
    border-radius: 4px;
    min-width: 220px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    font-size: 14px;
  }
  .toast.info { border-left-color: #2563eb; }
  .toast.success { border-left-color: #16a34a; }
  .toast.warning { border-left-color: #d97706; }
  .toast.error { border-left-color: #dc2626; }
  .msg { flex: 1; }
  .close {
    background: transparent;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
  }
</style>
