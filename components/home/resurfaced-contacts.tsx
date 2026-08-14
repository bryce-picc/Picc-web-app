'use client';

import { Copy, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ResurfacedContact } from '@/lib/follow-up/follow-up-intelligence';

function formatDate(value: string | null) {
  if (!value) return 'No interaction recorded';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function ResurfacedContacts({ contacts }: { contacts: ResurfacedContact[] }) {
  if (!contacts.length) return null;
  return <div className="grid gap-3 xl:grid-cols-2">{contacts.slice(0, 8).map((contact) => {
    const sms = contact.phone ? `sms:${contact.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(contact.suggestedMessage)}` : null;
    const gmail = contact.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(`Checking in with ${contact.accountName}`)}&body=${encodeURIComponent(contact.suggestedMessage)}` : null;
    return <article key={contact.id} className="rounded-[20px] border border-[#dce2eb] bg-white p-4 shadow-[0_8px_24px_rgba(24,33,45,0.05)]"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#c93412]"><Sparkles className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-[#18212d]">{contact.name}</h3><p className="truncate text-sm text-[#687486]">{contact.accountName}</p></div></div><div className="mt-4 rounded-xl bg-[#f4f7fb] p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7583]">Why {contact.name.split(' ')[0]} surfaced</p><p className="mt-2 text-sm leading-6 text-[#344052]">{contact.whySurfaced}</p></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#7a8492]">First met</p><p className="mt-1 font-medium text-[#344052]">{formatDate(contact.firstMetAt)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-[#7a8492]">Last met</p><p className="mt-1 font-medium text-[#344052]">{formatDate(contact.lastMetAt)}</p></div></div><div className="mt-4 border-t border-[#e1e6ed] pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#7a8492]">Suggested next step</p><p className="mt-1 font-semibold text-[#18212d]">{contact.suggestedTitle}</p><p className="mt-2 text-sm leading-6 text-[#5c6674]">{contact.suggestedMessage}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { void navigator.clipboard.writeText(contact.suggestedMessage).then(() => toast.success('Message copied')).catch(() => toast.error('Message could not be copied')); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbd3df] px-3 text-sm font-semibold"><Copy className="h-4 w-4" /> Copy</button>{sms ? <a href={sms} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbd3df] px-3 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Open Messages</a> : null}{gmail ? <a href={gmail} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#c93412] px-3 text-sm font-semibold text-white"><Mail className="h-4 w-4" /> Open Gmail</a> : null}</div></div></article>;
  })}</div>;
}
