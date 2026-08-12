'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ContactRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/contacts', label: 'Contacts', icon: ContactRound },
];

export function AccountsSectionTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Accounts sections"
      className="border-b border-[#d7dde7] bg-[#f7f9fc] px-3 py-2 md:px-5"
    >
      <div className="mx-auto grid max-w-md grid-cols-2 rounded-xl bg-[#e1e5eb] p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
                active
                  ? 'bg-white text-[#18212d] shadow-[0_1px_3px_rgba(31,35,43,0.12)]'
                  : 'text-[#687384] hover:text-[#2f3947]',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
