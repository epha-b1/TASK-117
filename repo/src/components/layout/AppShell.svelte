<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import Topbar from './Topbar.svelte';
  import FirstRunBanner from './FirstRunBanner.svelte';
  export let pageTitle = '';
</script>

<div class="shell">
  <Sidebar />
  <main class="content">
    <Topbar>
      <span slot="title">{pageTitle}</span>
    </Topbar>
    <FirstRunBanner />
    <section class="page"><slot /></section>
  </main>
</div>

<style>
  .shell {
    display: flex;
    min-height: 100vh;
    background: #f8fafc;
  }
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .page {
    padding: 20px;
    flex: 1;
    overflow: auto;
  }
  @media (max-width: 640px) {
    .shell { flex-direction: column; }
  }
</style>
