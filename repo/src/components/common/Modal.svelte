<script lang="ts">
  export let open = false;
  export let title = '';
  export let onClose: () => void = () => {};
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={handleKey} />

{#if open}
  <div class="overlay" on:click={onClose} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <button class="close" aria-label="Close" on:click={onClose}>×</button>
      </header>
      <div class="body"><slot /></div>
      {#if $$slots.footer}
        <footer><slot name="footer" /></footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #fff;
    border-radius: 6px;
    min-width: 360px;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
  }
  header h3 { margin: 0; font-size: 16px; }
  .close {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  .body {
    padding: 16px;
    overflow: auto;
  }
  footer {
    padding: 12px 16px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
