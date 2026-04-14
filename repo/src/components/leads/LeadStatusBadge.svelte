<script lang="ts">
  import Badge from '../common/Badge.svelte';
  import type { LeadStatus } from '../../types/lead.types';
  export let status: LeadStatus;

  const toneMap: Record<LeadStatus, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
    new: 'info',
    in_discussion: 'warning',
    quoted: 'info',
    confirmed: 'success',
    closed: 'neutral'
  };
  const labelMap: Record<LeadStatus, string> = {
    new: 'New',
    in_discussion: 'In Discussion',
    quoted: 'Quoted',
    confirmed: 'Confirmed',
    closed: 'Closed'
  };
</script>

<Badge tone={toneMap[status]} label={labelMap[status]} />
