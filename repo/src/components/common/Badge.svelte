<script lang="ts">
  export let tone: 'neutral' | 'info' | 'success' | 'warning' | 'error' = 'neutral';
  export let label: string;
</script>

<span class="badge {tone}">{label}</span>

<style>
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid transparent;
  }
  .neutral { background: #eee; color: #333; }
  .info { background: #dbeafe; color: #1e3a8a; }
  .success { background: #dcfce7; color: #166534; }
  .warning { background: #fef3c7; color: #92400e; }
  .error { background: #fee2e2; color: #991b1b; }
</style>
