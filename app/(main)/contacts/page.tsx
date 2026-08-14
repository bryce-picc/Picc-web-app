import { AccountsSectionTabs } from '@/components/crm/accounts-section-tabs';
import { ContactCreateFlow } from '@/components/crm/contact-create-flow';
import { ContactsTable } from '@/components/crm/contacts-table';
import { DataFreshnessBanner } from '@/components/shared/data-freshness';
import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { loadAccountContactRuntime } from '@/lib/server/account-contact-runtime';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const showArchived = (await searchParams).archived === '1';
  const [{ orgId }, runtime] = await Promise.all([requireWorkspaceContext(), loadAccountContactRuntime()]);
  const archivedIds = new Set(
    await prisma.crmContactProfile.findMany({ where: { orgId, archivedAt: { not: null } }, select: { notionContactPageId: true } })
      .then((profiles) => profiles.map((profile) => profile.notionContactPageId))
      .catch(() => []),
  );
  const visibleContacts = runtime.contacts.filter((contact) => archivedIds.has(contact.notionPageId.replace(/-/g, '').toLowerCase()) === showArchived);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)]">
      <AccountsSectionTabs />
      <div className="mx-auto max-w-[var(--app-shell-max)] space-y-3 px-4 pb-28 pt-4 md:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex rounded-lg border border-[#d4dbe5] bg-white p-1 text-sm font-semibold">
            <Link href="/contacts" className={showArchived ? 'rounded-md px-3 py-2 text-[#697486]' : 'rounded-md bg-[#edf2f8] px-3 py-2 text-[#18212d]'}>Active</Link>
            <Link href="/contacts?archived=1" className={showArchived ? 'rounded-md bg-[#edf2f8] px-3 py-2 text-[#18212d]' : 'rounded-md px-3 py-2 text-[#697486]'}>Archived</Link>
          </div>
          {!showArchived ? <ContactCreateFlow accounts={runtime.accounts} /> : null}
        </header>
        <section className="grid gap-2 sm:grid-cols-2" aria-label="Contact data freshness">
          <DataFreshnessBanner freshness={runtime.freshness.contacts} compact />
          <DataFreshnessBanner freshness={runtime.freshness.accounts} compact />
        </section>
        <ContactsTable rows={visibleContacts} accounts={runtime.accounts.map((account) => ({ id: account.notionPageId, name: account.name }))} />
      </div>
    </div>
  );
}
import Link from 'next/link';
