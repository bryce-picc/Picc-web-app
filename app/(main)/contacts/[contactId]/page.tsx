import { notFound } from 'next/navigation';
import { ContactProfileWorkspace } from '@/components/crm/contact-profile-workspace';
import { loadAccountContactRuntime } from '@/lib/server/account-contact-runtime';

function normalizeId(value: string) {
  return value.replace(/-/g, '').trim().toLowerCase();
}

export default async function ContactDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  const runtime = await loadAccountContactRuntime();
  const contact = runtime.contacts.find((row) => normalizeId(row.id) === normalizeId(contactId));
  if (!contact) notFound();

  const linkedAccounts = runtime.accounts
    .filter((account) => contact.accountPageIds.some((id) => normalizeId(id) === normalizeId(account.notionPageId)))
    .map((account) => ({ id: account.notionPageId, name: account.name }));

  return <ContactProfileWorkspace contact={contact} accounts={linkedAccounts} contacts={runtime.contacts} />;
}
