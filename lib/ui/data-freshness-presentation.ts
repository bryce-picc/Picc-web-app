import type { RuntimeFreshness } from '@/lib/runtime/account-contact-contract';

function formatRelativeAge(ageSeconds: number | null) {
  if (ageSeconds === null) return 'unknown';
  if (ageSeconds < 60) return 'just now';

  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Not recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function stateLabel(state: RuntimeFreshness['state']) {
  if (state === 'fresh') return 'Fresh';
  if (state === 'syncing') return 'Syncing';
  if (state === 'error') return 'Sync issue';
  if (state === 'stale') return 'Stale';
  return 'Unknown';
}

export function buildFreshnessDisclosure(freshness: RuntimeFreshness) {
  return {
    label: freshness.label,
    stateLabel: stateLabel(freshness.state),
    relativeAge: formatRelativeAge(freshness.ageSeconds),
    lastSyncLabel: `Last sync: ${formatTimestamp(freshness.syncedAt)}`,
    detail: freshness.detail,
    recordsLabel: `Records: ${freshness.recordsRead.toLocaleString('en-US')}`,
    error: freshness.error,
  };
}
