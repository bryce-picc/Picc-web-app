import type { ContactActionKind } from '@/lib/contacts/contact-actions';

export type FollowUpDefaults = { defaultEmailDays: number; defaultTextDays: number; defaultCallDays: number };

function isoDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function defaultFollowUpDate(action: ContactActionKind, preferences: FollowUpDefaults, now = new Date()) {
  const days = action === 'email' ? preferences.defaultEmailDays : action === 'text' ? preferences.defaultTextDays : preferences.defaultCallDays;
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function isBriefingDeliveryWindow(now: Date, timezone: string, configuredTime: string) {
  const [expectedHour] = configuredTime.split(':').map(Number);
  if (!Number.isInteger(expectedHour)) return false;
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(now));
  return hour === expectedHour;
}

export type ResurfaceCandidate = {
  id: string;
  name: string;
  accountName: string;
  email: string;
  phone: string;
  favorite: boolean;
  frequencyDays: number | null;
  firstMetAt: string;
  lastMetAt: string | null;
  reminderNote: string | null;
  reminderDueAt: string | null;
};

export type ResurfacedContact = ResurfaceCandidate & {
  whySurfaced: string;
  suggestedTitle: string;
  suggestedMessage: string;
  urgency: number;
};

export function buildResurfacedContacts(candidates: ResurfaceCandidate[], now = new Date()): ResurfacedContact[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return candidates.flatMap((candidate) => {
    const lastMet = candidate.lastMetAt ? new Date(candidate.lastMetAt) : new Date(candidate.firstMetAt);
    const quietDays = Math.max(0, Math.floor((today.getTime() - lastMet.getTime()) / 86_400_000));
    const reminderDue = candidate.reminderDueAt ? new Date(candidate.reminderDueAt) <= today : false;
    const cadenceDue = candidate.frequencyDays ? quietDays >= candidate.frequencyDays : false;
    const favoriteQuiet = candidate.favorite && quietDays >= 21;
    if (!reminderDue && !cadenceDue && !favoriteQuiet) return [];
    const whySurfaced = reminderDue && candidate.reminderNote
      ? `Reminder due: ${candidate.reminderNote}`
      : cadenceDue
        ? `${quietDays} days since the last interaction, past the ${candidate.frequencyDays}-day contact frequency.`
        : `Favorite contact with no interaction for ${quietDays} days.`;
    return [{
      ...candidate,
      whySurfaced,
      suggestedTitle: `Reconnect with ${candidate.name}`,
      suggestedMessage: `Hi ${candidate.name.split(' ')[0]}, wanted to check in and see what would be most helpful from PICC right now.`,
      urgency: (reminderDue ? 1000 : 0) + (cadenceDue ? 500 : 0) + quietDays + (candidate.favorite ? 50 : 0),
    }];
  }).sort((left, right) => right.urgency - left.urgency || left.name.localeCompare(right.name));
}

export type BriefingStore = {
  id: string;
  name: string;
  repEmails: string[];
  followUpNeeded: boolean;
  followUpDate: string | null;
  followUpReason: string | null;
  statusKey: string;
  pppStatus: string | null;
  lastSampleDate: string | null;
};

function assigned(store: BriefingStore, email: string) {
  const normalized = email.trim().toLowerCase();
  return store.repEmails.some((candidate) => candidate.trim().toLowerCase() === normalized);
}

export function buildDailyBriefing(stores: BriefingStore[], recipientEmail: string, localDate: string) {
  const mine = stores.filter((store) => assigned(store, recipientEmail));
  const followUps = mine
    .filter((store) => store.followUpNeeded && Boolean(store.followUpDate) && store.followUpDate!.slice(0, 10) <= localDate)
    .sort((left, right) => (left.followUpDate ?? '').localeCompare(right.followUpDate ?? '') || left.name.localeCompare(right.name));
  const pppOnboarding = mine
    .filter((store) => {
      const status = store.pppStatus?.trim().toLowerCase();
      return Boolean(status) && !['approved & connected', 'complete', 'completed', 'closed'].includes(status!);
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const warmLeads = mine
    .filter((store) => store.statusKey.trim().toLowerCase() === 'lead - hot')
    .sort((left, right) => (right.lastSampleDate ?? '').localeCompare(left.lastSampleDate ?? '') || left.name.localeCompare(right.name));
  return { followUps, pppOnboarding, warmLeads };
}
