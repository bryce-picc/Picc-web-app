import { describe, expect, it } from 'vitest';
import { buildFreshnessDisclosure } from '@/lib/ui/data-freshness-presentation';
import type { RuntimeFreshness } from '@/lib/runtime/account-contact-contract';

function freshness(overrides: Partial<RuntimeFreshness> = {}): RuntimeFreshness {
  return {
    source: 'notion-contacts',
    label: 'Contacts',
    state: 'fresh',
    syncedAt: '2026-08-14T14:30:00.000Z',
    lastEditedAt: '2026-08-14T14:20:00.000Z',
    recordsRead: 2682,
    ageSeconds: 90,
    stale: false,
    syncing: false,
    error: null,
    detail: 'Notion contact cache is current.',
    ...overrides,
  };
}

describe('buildFreshnessDisclosure', () => {
  it('keeps the collapsed summary to source, state, and the last sync date', () => {
    expect(buildFreshnessDisclosure(freshness())).toEqual({
      label: 'Contacts',
      stateLabel: 'Fresh',
      relativeAge: '1m ago',
      lastSyncLabel: 'Last sync: Aug 14, 2026, 10:30 AM',
      detail: 'Notion contact cache is current.',
      recordsLabel: 'Records: 2,682',
      error: null,
    });
  });

  it('uses a clear fallback without exposing invalid timestamps', () => {
    expect(buildFreshnessDisclosure(freshness({ syncedAt: null, ageSeconds: null })).lastSyncLabel).toBe(
      'Last sync: Not recorded',
    );
    expect(buildFreshnessDisclosure(freshness({ syncedAt: 'invalid' })).lastSyncLabel).toBe(
      'Last sync: Invalid date',
    );
  });
});
