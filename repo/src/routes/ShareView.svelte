<script lang="ts">
  import { onMount } from 'svelte';
  import { planService } from '../services/plan.service';
  import BomEditor from '../components/plans/BomEditor.svelte';
  import type { PlanWithBom } from '../types/plan.types';
  import { formatDate } from '../utils/format';

  export let token = '';

  let plan: PlanWithBom | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const result = await planService.validateShareToken(token);
      if (!result) {
        error = 'This share link is invalid, revoked, or has expired.';
      } else {
        plan = result;
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="share-view">
  {#if loading}
    <p>Loading shared plan…</p>
  {:else if error}
    <div class="error-box">{error}</div>
  {:else if plan}
    <header>
      <h1>{plan.title}</h1>
      <div class="meta">
        Version {plan.currentVersion} · Status: {plan.status} · Updated {formatDate(plan.updatedAt)}
      </div>
      {#if plan.tags.length}
        <div class="tags">{plan.tags.join(' · ')}</div>
      {/if}
      {#if plan.notes}
        <p class="notes">{plan.notes}</p>
      {/if}
    </header>
    <h2>BOM</h2>
    <BomEditor planId={plan.id} items={plan.bom} readOnly={true} />
  {/if}
</div>

<style>
  .share-view { padding: 40px; max-width: 960px; margin: 0 auto; background: #fff; min-height: 100vh; }
  h1 { margin: 0 0 4px; }
  .meta { font-size: 13px; color: #555; }
  .tags { font-size: 12px; color: #666; margin-top: 4px; }
  .notes { background: #f7f7f7; padding: 10px; border-radius: 4px; white-space: pre-wrap; }
  .error-box { background: #fef2f2; color: #991b1b; padding: 16px; border-radius: 6px; }
</style>
