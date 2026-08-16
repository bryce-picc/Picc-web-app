'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AdvancedDataTable } from '@/components/crm/advanced-data-table';
import { ContactQuickActions, type ContactQuickActionAccount } from '@/components/crm/contact-quick-actions';
import { Badge } from '@/components/ui';

export type ContactTableRow = {
  id: string;
  name: string;
  roleTitle: string;
  accountName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  linkedWork: string;
  accountPageIds?: string[];
};

function normalizePageId(value: string) {
  return value.replace(/-/g, '').trim().toLowerCase();
}

export function ContactsTable({ rows, accounts }: { rows: ContactTableRow[]; accounts: ContactQuickActionAccount[] }) {
  const accountById = new Map(accounts.map((account) => [normalizePageId(account.id), account]));
  const accountsFor = (row: ContactTableRow) =>
    (row.accountPageIds ?? [])
      .map((id) => accountById.get(normalizePageId(id)))
      .filter((account): account is ContactQuickActionAccount => Boolean(account));

  const columns: ColumnDef<ContactTableRow>[] = [
  {
    accessorKey: 'name',
    header: 'Contact',
    cell: ({ row }) => (
      <div>
        <p className="font-semibold">{row.original.name}</p>
        <p className="text-xs text-slate-500">{row.original.roleTitle}</p>
      </div>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Dispensary',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}>{row.original.status}</Badge>,
  },
  {
    accessorKey: 'linkedWork',
    header: 'Linked Work',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <ContactQuickActions
        contact={row.original}
        accounts={accountsFor(row.original)}
      />
    ),
  },
];

  return (
    <AdvancedDataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search contact, role, or dispensary..."
      getRowHref={(row) => `/contacts/${encodeURIComponent(row.id)}`}
      rowAriaLabel={(row) => `Open contact ${row.name}`}
      mobileCardRenderer={(row) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{row.name}</p>
              <p className="text-xs text-slate-500">{row.roleTitle}</p>
            </div>
            <Badge variant={row.status === 'ACTIVE' ? 'success' : 'secondary'}>{row.status}</Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p className="font-medium text-[#344052]">{row.accountName}</p>
            <p className="break-all">{row.email}</p>
            <p>{row.phone}</p>
          </div>
          <ContactQuickActions contact={row} accounts={accountsFor(row)} className="pt-1" labels="always" />
        </>
      )}
    />
  );
}
