<script lang="ts" generics="T extends Record<string, unknown>">
  export let columns: Array<{ key: keyof T; label: string; format?: (row: T) => string }>;
  export let rows: T[];
  export let onRowClick: (row: T) => void = () => {};
  export let emptyMessage = 'No records';
</script>

<table class="data-table">
  <thead>
    <tr>
      {#each columns as col}
        <th>{col.label}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#if rows.length === 0}
      <tr><td colspan={columns.length} class="empty">{emptyMessage}</td></tr>
    {:else}
      {#each rows as row}
        <tr on:click={() => onRowClick(row)} class="clickable">
          {#each columns as col}
            <td>
              {col.format ? col.format(row) : (row[col.key] as unknown as string) ?? ''}
            </td>
          {/each}
        </tr>
      {/each}
    {/if}
  </tbody>
</table>

<style>
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th, td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
  }
  th { background: #f7f7f7; font-weight: 600; }
  tr.clickable { cursor: pointer; }
  tr.clickable:hover td { background: #fafafa; }
  .empty { text-align: center; color: #888; padding: 24px; }
</style>
