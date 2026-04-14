<script lang="ts">
  export let open = false;
  export let title = '';
  export let onClose: () => void = () => {};
</script>

{#if open}
  <div class="drawer-overlay" on:click={onClose} role="presentation">
    <aside class="drawer" on:click|stopPropagation role="dialog" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <button class="close" on:click={onClose} aria-label="Close">×</button>
      </header>
      <div class="body"><slot /></div>
    </aside>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 900;
    display: flex;
    justify-content: flex-end;
  }
  .drawer {
    background: #fff;
    width: min(480px, 90vw);
    height: 100%;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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
  .body { padding: 16px; overflow: auto; flex: 1; }
</style>
