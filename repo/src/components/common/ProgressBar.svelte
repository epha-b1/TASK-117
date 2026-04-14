<script lang="ts">
  export let value = 0;
  export let max = 100;
  $: pct = Math.max(0, Math.min(100, (value / max) * 100));
</script>

<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}>
  <div class="fill" style="width: {pct}%"></div>
</div>

<style>
  .progress {
    background: #eee;
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
  }
  .fill {
    background: #2563eb;
    height: 100%;
    transition: width 0.2s;
  }
</style>
