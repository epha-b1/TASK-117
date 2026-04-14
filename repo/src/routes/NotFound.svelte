<script lang="ts">
  import { navigate } from '../router';
  import { currentRole } from '../stores/session.store';
  import { defaultRouteFor } from '../guards/route-guard';
  function goHome() {
    navigate(defaultRouteFor($currentRole));
  }
</script>

<div class="notfound">
  <h2>Page not found</h2>
  <button on:click={goHome}>Go home</button>
</div>

<style>
  .notfound { padding: 40px; text-align: center; }
  button { padding: 8px 16px; }
</style>
