import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import LeadDrawer from '../../src/components/leads/LeadDrawer.svelte';
import { leadService } from '../../src/services/lead.service';
import { toasts } from '../../src/stores/toast.store';
import { setSession, clearSession } from '../../src/stores/session.store';
import type { Lead } from '../../src/types/lead.types';

function buildLead(overrides: Partial<Lead> = {}): Lead {
  const now = Date.now();
  return {
    id: 'lead-1',
    title: 'Rework widgets',
    requirements: 'Rebuild to new spec',
    budget: 1200,
    availabilityStart: now,
    availabilityEnd: now + 86_400_000,
    contactName: 'Ada',
    contactPhone: '5551234567',
    contactEmail: 'ada@x.y',
    status: 'new',
    assignedTo: 'u1',
    lastUpdatedAt: now,
    slaFlagged: false,
    createdAt: now,
    updatedAt: now,
    history: [
      { timestamp: now, actor: 'u1', fromStatus: null, toStatus: 'new', note: '' }
    ],
    ...overrides
  };
}

describe('<LeadDrawer>', () => {
  beforeEach(() => {
    toasts.set([]);
    clearSession();
  });
  afterEach(() => {
    toasts.set([]);
    clearSession();
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing visible when open=false', () => {
    const { queryByRole } = render(LeadDrawer, {
      props: { open: false, lead: buildLead() }
    });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('shows lead details when open with a lead', () => {
    const lead = buildLead({ title: 'Fabrication order', budget: 500 });
    const { getByText, getByRole, container } = render(LeadDrawer, {
      props: { open: true, lead }
    });
    expect(getByRole('dialog').getAttribute('aria-label')).toBe('Fabrication order');
    expect(getByText('New')).toBeInTheDocument();
    expect(getByText('$500.00')).toBeInTheDocument();
    // Contact block packs name/phone/email with <br>s; match the overall text.
    expect(container.textContent).toContain('Ada');
    expect(container.textContent).toContain('5551234567');
    expect(container.textContent).toContain('ada@x.y');
    // History includes the "Created" entry.
    expect(getByText('Created')).toBeInTheDocument();
  });

  it('shows allowed status transitions and disables none of them for "new"', () => {
    const lead = buildLead({ status: 'new' });
    const { getByText } = render(LeadDrawer, {
      props: { open: true, lead }
    });
    expect(getByText('in discussion')).toBeInTheDocument();
    expect(getByText('closed')).toBeInTheDocument();
  });

  it('hides transition section entirely when lead is "closed" (no allowed next states)', () => {
    const lead = buildLead({ status: 'closed' });
    const { queryByText } = render(LeadDrawer, {
      props: { open: true, lead }
    });
    expect(queryByText('Move to next status')).toBeNull();
  });

  it('SLA badge does NOT render when lead.slaFlagged=false', () => {
    const { queryByText } = render(LeadDrawer, {
      props: { open: true, lead: buildLead({ slaFlagged: false }) }
    });
    expect(queryByText('SLA overdue')).toBeNull();
  });

  it('SLA badge renders when lead.slaFlagged=true', async () => {
    const { findByText } = render(LeadDrawer, {
      props: { open: true, lead: buildLead({ slaFlagged: true }) }
    });
    await findByText('SLA overdue');
  });

  it('transition button calls leadService.transitionStatus and pushes success toast', async () => {
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });
    const spy = vi
      .spyOn(leadService, 'transitionStatus')
      .mockResolvedValue(undefined as never);
    const onChange = vi.fn();
    const onClose = vi.fn();
    const { getByText, container } = render(LeadDrawer, {
      props: { open: true, lead: buildLead({ status: 'new' }), onChange, onClose }
    });

    // Type a note and click "in discussion".
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Kickoff call scheduled';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    await fireEvent.click(getByText('in discussion'));
    await Promise.resolve();

    expect(spy).toHaveBeenCalledWith('lead-1', 'in_discussion', 'u1', 'Kickoff call scheduled');
    expect(onChange).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(get(toasts).some((t) => t.level === 'success')).toBe(true);
  });

  it('transition surfaces an error toast when the service rejects', async () => {
    setSession({ userId: 'u1', username: 'a', role: 'administrator' });
    vi.spyOn(leadService, 'transitionStatus').mockRejectedValue(new Error('denied'));
    const onClose = vi.fn();
    const { getByText } = render(LeadDrawer, {
      props: { open: true, lead: buildLead({ status: 'new' }), onClose }
    });

    await fireEvent.click(getByText('closed'));
    await new Promise((r) => setTimeout(r, 5));

    expect(get(toasts).some((t) => t.level === 'error' && t.message === 'denied')).toBe(true);
    // Drawer stays open on error.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('transition is a no-op when no session (guard branch)', async () => {
    const spy = vi.spyOn(leadService, 'transitionStatus').mockResolvedValue(undefined as never);
    const { getByText } = render(LeadDrawer, {
      props: { open: true, lead: buildLead({ status: 'new' }) }
    });
    await fireEvent.click(getByText('closed'));
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('Drawer Close button invokes onClose', async () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(LeadDrawer, {
      props: { open: true, lead: buildLead(), onClose }
    });
    await fireEvent.click(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
