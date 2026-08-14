'use client';

import { ExternalLink, Loader2, MailSearch, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type Suggestion = { email: string; name: string; messageCount: number; lastInteractionAt: string };

export function GmailSuggestedContacts() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/gmail/suggestions', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as { suggestions?: Suggestion[]; mailboxEmail?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Suggested contacts could not be loaded.');
      setSuggestions(payload.suggestions ?? []);
      setMailboxEmail(payload.mailboxEmail ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Suggested contacts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#d8dfe8] bg-white p-4 shadow-[0_8px_28px_rgba(24,33,45,0.05)]" aria-labelledby="gmail-suggestions-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#c93412]"><MailSearch className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 id="gmail-suggestions-heading" className="font-semibold text-[#18212d]">Suggested contacts from Gmail</h2><p className="mt-1 text-sm text-[#687486]">Review recent people not already in the CRM. Nothing is added automatically.</p>{mailboxEmail ? <p className="mt-1 truncate text-xs text-[#7a8492]">From {mailboxEmail}</p> : null}</div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label={suggestions ? 'Refresh Gmail suggestions' : 'Find suggested contacts in Gmail'} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#cbd3df] bg-white px-3 text-sm font-semibold disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : suggestions ? <RefreshCw className="h-4 w-4" /> : <MailSearch className="h-4 w-4" />}<span className="hidden sm:inline">{suggestions ? 'Refresh' : 'Find contacts'}</span></button>
      </div>
      {error ? <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{error.includes('Connect Gmail') ? <>{error} <Link href="/settings#connected-services" className="font-semibold underline">Open Settings</Link></> : error}</div> : null}
      {suggestions ? suggestions.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{suggestions.map((person) => {
        const addUrl = `/contacts?new=1&name=${encodeURIComponent(person.name)}&email=${encodeURIComponent(person.email)}`;
        const gmailUrl = `https://mail.google.com/mail/u/${encodeURIComponent(mailboxEmail || '0')}/#search/${encodeURIComponent(person.email)}`;
        return <div key={person.email} className="rounded-xl border border-[#dce2eb] bg-[#f8fafc] p-3"><div className="min-w-0"><p className="truncate font-semibold text-[#263242]">{person.name}</p><p className="truncate text-sm text-[#687486]">{person.email}</p><p className="mt-1 text-xs text-[#7a8492]">{person.messageCount} recent emails · last {new Date(person.lastInteractionAt).toLocaleDateString()}</p></div><div className="mt-3 flex gap-2"><Link href={addUrl} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#c93412] px-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Quick add</Link><a href={gmailUrl} target="_blank" rel="noreferrer" aria-label={`Open Gmail for ${person.email}`} className="grid h-10 w-10 place-items-center rounded-lg border border-[#cbd3df] bg-white"><ExternalLink className="h-4 w-4" /></a></div></div>;
      })}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#cfd6e1] bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#687486]">No new suggestions found in recent Gmail activity.</p> : null}
    </section>
  );
}
