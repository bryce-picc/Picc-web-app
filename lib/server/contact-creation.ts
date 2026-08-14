import {
  buildRoleCollisionPreview,
  type ContactRole,
  type ExistingRoleAssignment,
} from '@/lib/contacts/contact-profile';

export type CreateContactInput = {
  accountPageId: string;
  name: string;
  position: string;
  email: string | null;
  phone: string | null;
  roles?: ContactRole[];
  overwriteRoles?: boolean;
};

export type ContactRecord = {
  id: string;
  name: string;
  position: string;
  email: string | null;
  phone: string | null;
};

export type ContactCreationOutcome =
  | {
      status: 'created_verified' | 'existing_verified';
      contact: ContactRecord;
      accountPageId: string;
    }
  | {
      status: 'partial_relation';
      contact: ContactRecord;
      accountPageId: string;
      retry: {
        accountPageId: string;
        contactPageId: string;
      };
    }
  | {
      status: 'role_collision';
      contact: ContactRecord | null;
      accountPageId: string;
      collisions: ReturnType<typeof buildRoleCollisionPreview>;
    };

export type RetryContactLinkInput = {
  accountPageId: string;
  contactPageId: string;
};

export interface ContactCreationAdapter {
  requireAccount(accountPageId: string): Promise<void>;
  findContact(accountPageId: string, normalizedName: string): Promise<ContactRecord | null>;
  getContact(contactPageId: string): Promise<ContactRecord>;
  createContact(input: CreateContactInput): Promise<ContactRecord>;
  ensureAccountContact(accountPageId: string, contactPageId: string): Promise<void>;
  verifyBothSides(accountPageId: string, contactPageId: string): Promise<boolean>;
  getRoleAssignments?(
    accountPageId: string,
    roles: ContactRole[],
  ): Promise<Partial<Record<ContactRole, ExistingRoleAssignment[]>>>;
  assignRoles?(accountPageId: string, contactPageId: string, roles: ContactRole[]): Promise<void>;
  refreshContacts(): Promise<void>;
}

export function normalizeContactName(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function partialOutcome(
  accountPageId: string,
  contact: ContactRecord,
): ContactCreationOutcome {
  return {
    status: 'partial_relation',
    contact,
    accountPageId,
    retry: {
      accountPageId,
      contactPageId: contact.id,
    },
  };
}

async function finishRelationship(
  accountPageId: string,
  contact: ContactRecord,
  adapter: ContactCreationAdapter,
  verifiedStatus: 'created_verified' | 'existing_verified',
  roles: ContactRole[] = [],
): Promise<ContactCreationOutcome> {
  try {
    await adapter.ensureAccountContact(accountPageId, contact.id);
    if (roles.length > 0) {
      if (!adapter.assignRoles) throw new Error('Contact role assignment is unavailable');
      await adapter.assignRoles(accountPageId, contact.id, roles);
    }
    const verified = await adapter.verifyBothSides(accountPageId, contact.id);
    if (!verified) {
      return partialOutcome(accountPageId, contact);
    }

    await adapter.refreshContacts().catch(() => undefined);
    return {
      status: verifiedStatus,
      contact,
      accountPageId,
    };
  } catch {
    return partialOutcome(accountPageId, contact);
  }
}

export async function createVerifiedContact(
  input: CreateContactInput,
  adapter: ContactCreationAdapter,
): Promise<ContactCreationOutcome> {
  await adapter.requireAccount(input.accountPageId);

  const existing = await adapter.findContact(
    input.accountPageId,
    normalizeContactName(input.name),
  );
  const roles = input.roles ?? [];
  if (roles.length > 0) {
    if (!adapter.getRoleAssignments) throw new Error('Contact role preview is unavailable');
    const existingAssignments = await adapter.getRoleAssignments(input.accountPageId, roles);
    const collisions = buildRoleCollisionPreview({
      selectedRoles: roles,
      candidateContactId: existing?.id,
      existingAssignments,
    });
    if (collisions.length > 0 && !input.overwriteRoles) {
      return {
        status: 'role_collision',
        contact: existing,
        accountPageId: input.accountPageId,
        collisions,
      };
    }
  }
  if (existing) {
    return finishRelationship(input.accountPageId, existing, adapter, 'existing_verified', roles);
  }

  const created = await adapter.createContact(input);
  return finishRelationship(input.accountPageId, created, adapter, 'created_verified', roles);
}

export async function retryVerifiedContactLink(
  input: RetryContactLinkInput,
  adapter: ContactCreationAdapter,
): Promise<ContactCreationOutcome> {
  await adapter.requireAccount(input.accountPageId);
  const contact = await adapter.getContact(input.contactPageId);
  return finishRelationship(input.accountPageId, contact, adapter, 'existing_verified');
}
