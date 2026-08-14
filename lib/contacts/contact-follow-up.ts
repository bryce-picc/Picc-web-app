import type { ContactActionKind } from '@/lib/contacts/contact-actions';

type FollowUpAccount = {
  id: string;
  name: string;
};

type FollowUpContact = {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  phone: string;
};

function launchedActionLabel(action: ContactActionKind) {
  if (action === 'email') return 'opening Gmail';
  if (action === 'text') return 'opening the message app';
  return 'opening the phone app';
}

export function buildCommunicationFollowUpPayload(input: {
  action: ContactActionKind;
  account: FollowUpAccount;
  contact: FollowUpContact;
  followUpDate: string;
  reason: string;
}) {
  const reason = input.reason.trim() || `Follow up after ${input.action} with ${input.contact.name}`;

  return {
    store: {
      id: input.account.id,
      notionPageId: input.account.id,
      name: input.account.name,
    },
    noteText: `Follow-up scheduled after ${launchedActionLabel(input.action)} for ${input.contact.name}.`,
    followUpDate: input.followUpDate,
    followUpNeeded: true,
    followUpReason: reason,
    associatedContact: {
      id: input.contact.id,
      name: input.contact.name,
      roleTitle: input.contact.roleTitle,
      email: input.contact.email,
      phone: input.contact.phone,
    },
  };
}

export function buildAccountFollowUpPayload(input: {
  account: FollowUpAccount & { notionPageId: string };
  followUpDate: string;
  reason: string;
}) {
  const reason = input.reason.trim();

  return {
    store: {
      id: input.account.id,
      notionPageId: input.account.notionPageId,
      name: input.account.name,
    },
    noteText: `New follow-up scheduled: ${reason}`,
    followUpDate: input.followUpDate,
    followUpNeeded: true,
    followUpReason: reason,
  };
}
