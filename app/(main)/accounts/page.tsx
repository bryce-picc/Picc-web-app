import { AccountsMobile } from '@/components/mobile/accounts-mobile';
import { AccountsSectionTabs } from '@/components/crm/accounts-section-tabs';

export default async function AccountsPage() {
  return (
    <>
      <AccountsSectionTabs />
      <AccountsMobile />
    </>
  );
}
