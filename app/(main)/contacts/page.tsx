import { AccountsSectionTabs } from '@/components/crm/accounts-section-tabs';
import { ContactCreateFlow } from '@/components/crm/contact-create-flow';
import { ContactsTable } from '@/components/crm/contacts-table';
import { DataFreshnessBanner } from '@/components/shared/data-freshness';
import { loadAccountContactRuntime } from '@/lib/server/account-contact-runtime';

export default async function ContactsPage() {
  const runtime = await loadAccountContactRuntime();

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)]">
      <AccountsSectionTabs />
      <div className="mx-auto max-w-[var(--app-shell-max)] space-y-3 px-4 pb-28 pt-4 md:px-6">
        <header className="flex justify-end">
          <ContactCreateFlow accounts={runtime.accounts} />
        </header>
        <section className="grid gap-2 sm:grid-cols-2" aria-label="Contact data freshness">
          <DataFreshnessBanner freshness={runtime.freshness.contacts} compact />
          <DataFreshnessBanner freshness={runtime.freshness.accounts} compact />
        </section>
        <ContactsTable rows={runtime.contacts} accounts={runtime.accounts.map((account) => ({ id: account.notionPageId, name: account.name }))} />
      </div>
    </div>
  );
}
