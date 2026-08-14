import { normalizeContactPhone } from '@/lib/contacts/contact-actions';
import type { AppRole } from '@/lib/types/rbac';

export const CONTACT_ROLE_OPTIONS = [
  { value: 'PRIMARY_CONTACT', label: 'Primary Contact', notionProperty: 'Primary Contact' },
  { value: 'SECOND_CONTACT', label: '2nd Contact', notionProperty: '2nd Contact' },
  { value: 'PPP_2', label: 'PPP #2', notionProperty: 'PPP #2' },
  { value: 'PPP_3', label: 'PPP #3', notionProperty: 'PPP #3' },
  { value: 'BILLING_CONTACT', label: 'Billing Contact', notionProperty: 'Billing Contact' },
] as const;

export type ContactRole = (typeof CONTACT_ROLE_OPTIONS)[number]['value'];

export type ExistingRoleAssignment = { id: string; name: string };

export function contactProfilePermissions(role: AppRole) {
  const canEditProfile = role === 'ADMIN' || role === 'OPS_TEAM' || role === 'SALES_REP' || role === 'BRAND_AMBASSADOR';
  const canManageLifecycle = role === 'ADMIN' || role === 'OPS_TEAM' || role === 'SALES_REP';
  const canDeleteOrMerge = role === 'ADMIN' || role === 'OPS_TEAM';
  return { canEditProfile, canManageLifecycle, canDeleteOrMerge };
}

type MergeableContactProfile = {
  favorite: boolean;
  frequencyDays: number | null;
  lastSeenAt: Date | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
};

export function mergeContactProfileValues(source: MergeableContactProfile, target: MergeableContactProfile) {
  const lastSeenAt = !source.lastSeenAt
    ? target.lastSeenAt
    : !target.lastSeenAt || source.lastSeenAt > target.lastSeenAt
      ? source.lastSeenAt
      : target.lastSeenAt;
  return {
    favorite: source.favorite || target.favorite,
    frequencyDays: target.frequencyDays ?? source.frequencyDays,
    lastSeenAt,
    instagramUrl: target.instagramUrl || source.instagramUrl,
    linkedinUrl: target.linkedinUrl || source.linkedinUrl,
  };
}

const roleOptionByValue = new Map(CONTACT_ROLE_OPTIONS.map((option) => [option.value, option]));

function normalizeId(value: string) {
  return value.replace(/-/g, '').trim().toLocaleLowerCase('en-US');
}

export function buildRoleCollisionPreview(input: {
  selectedRoles: ContactRole[];
  candidateContactId?: string | null;
  existingAssignments: Partial<Record<ContactRole, ExistingRoleAssignment[]>>;
}) {
  const candidateId = normalizeId(input.candidateContactId ?? '');

  return input.selectedRoles.flatMap((role) => {
    const existingContacts = (input.existingAssignments[role] ?? []).filter(
      (contact) => !candidateId || normalizeId(contact.id) !== candidateId,
    );
    if (existingContacts.length === 0) return [];

    return [{
      role,
      label: roleOptionByValue.get(role)?.label ?? role,
      existingContacts,
    }];
  });
}

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildContactVCard(input: {
  name: string;
  company: string;
  roleTitle: string;
  email: string;
  phone: string;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(input.name)}`,
    `ORG:${escapeVCard(input.company)}`,
    `TITLE:${escapeVCard(input.roleTitle)}`,
  ];
  if (input.email.trim() && input.email.trim() !== '—') lines.push(`EMAIL;TYPE=INTERNET:${input.email.trim()}`);
  const phone = normalizeContactPhone(input.phone);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
  if (input.instagramUrl?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${input.instagramUrl.trim()}`);
  if (input.linkedinUrl?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${input.linkedinUrl.trim()}`);
  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

export function validateContactMerge(input: { sourceId: string; targetId: string }) {
  const sourceId = input.sourceId.trim();
  const targetId = input.targetId.trim();
  if (!sourceId || !targetId) throw new Error('Choose both contacts before merging.');
  if (normalizeId(sourceId) === normalizeId(targetId)) throw new Error('Choose a different contact to merge into.');
  return { sourceId, targetId };
}
