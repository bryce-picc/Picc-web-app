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
      <div className="mx-auto max-w-[var(--app-shell-max)] space-y-5 px-4 pb-28 pt-5 md:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#818a98]">Accounts</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#18212d]">Contacts</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#657081]">People linked to each dispensary in the live CRM.</p>
          </div>
          <ContactCreateFlow accounts={runtime.accounts} />
        </header>
        <section className="grid gap-3 lg:grid-cols-2" aria-label="Contact data freshness">
          <DataFreshnessBanner freshness={runtime.freshness.contacts} compact />
          <DataFreshnessBanner freshness={runtime.freshness.accounts} compact />
        </section>
        <ContactsTable rows={runtime.contacts} />
      </div>
    </div>
  );
}
