'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button } from '@/components/ui';

type Decision = 'KEEP_CURRENT_OWNER' | 'TRANSFER_TO_INCOMING';
type Conflict = {
  id: string;
  metadata: {
    status: 'OPEN' | 'RESOLVED'; occurrenceCount: number; lastDetectedAt: string;
    incomingAccountName: string; currentOwnerAccountName: string | null;
    sourceIdentifiers: { nabisRetailerId: string | null; licenseNumber: string | null };
    email: { status: 'PENDING' | 'SENT' | 'FAILED' | 'UNAVAILABLE'; error?: string | null };
    resolution?: { decision: Decision; resolvedAt: string };
  };
};
type ReviewResponse = {
  conflicts: Conflict[];
  preference: { email: string; emailEnabled: boolean; inAppEnabled: boolean };
  emailProviderReady: boolean;
};

function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

export function NabisIdentityReviewPanel() {
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; decision: Decision } | null>(null);
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const openConflicts = useMemo(() => data?.conflicts.filter((item) => item.metadata.status === 'OPEN') ?? [], [data]);
  const resolvedConflicts = useMemo(() => data?.conflicts.filter((item) => item.metadata.status === 'RESOLVED').slice(0, 5) ?? [], [data]);

  const applyData = useCallback((payload: ReviewResponse) => {
    setData(payload);
    setEmail(payload.preference.email);
    setEmailEnabled(payload.preference.emailEnabled);
    setInAppEnabled(payload.preference.inAppEnabled);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/nabis-identity-conflicts', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load identity reviews');
      applyData(payload as ReviewResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load identity reviews');
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => { void load(); }, [load]);

  async function request(method: 'PATCH' | 'POST', body: Record<string, string | boolean>) {
    const response = await fetch('/api/settings/nabis-identity-conflicts', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Unable to update identity review');
    applyData(payload as ReviewResponse);
  }

  async function savePreference() {
    setSaving(true);
    try {
      await request('PATCH', { email, emailEnabled, inAppEnabled });
      toast.success('Nabis conflict alerts saved.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save alert settings'); }
    finally { setSaving(false); }
  }

  async function runAction(body: Record<string, string>, message: string) {
    setActingId(body.notificationId);
    try {
      await request('POST', body);
      setConfirm(null);
      toast.success(message);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update identity review'); }
    finally { setActingId(null); }
  }

  return (
    <section id="nabis-identity-review" className="scroll-mt-24 rounded-2xl border border-[#d6dae2] bg-white px-4 py-5 [&_button]:min-h-11 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#3559a9]" />
            <h3 className="text-[17px] font-semibold text-[#1d1f23]">Nabis identity review</h3>
            <Badge variant={openConflicts.length ? 'warning' : 'success'}>{openConflicts.length} open</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-[#5c6674]">Sales continue syncing when Nabis and CRM ownership disagree. Resolve ownership here; the app never guesses.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh reviews
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f7f9fc] p-4">
        <div className="flex flex-wrap items-center gap-2 text-[#24324f]">
          <Mail className="h-4 w-4" /><p className="text-[14px] font-semibold">Conflict alerts</p>
          <Badge variant={data?.emailProviderReady ? 'success' : 'warning'}>{data?.emailProviderReady ? 'email ready' : 'email setup required'}</Badge>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto] lg:items-end">
          <label className="text-sm font-medium text-[#38404d]">Review email
            <input type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} className="mt-1 block h-11 w-full rounded-xl border border-[#cbd2dc] bg-white px-3 text-sm outline-none focus:border-[#5f86e8] focus:ring-2 focus:ring-[#dce7ff]" placeholder="admin@company.com" />
          </label>
          <Toggle label="Email" checked={emailEnabled} onChange={setEmailEnabled} />
          <Toggle label="In-app" checked={inAppEnabled} onChange={setInAppEnabled} />
          <Button type="button" className="bg-[#24324f] text-white hover:bg-[#1c2840]" onClick={() => void savePreference()} disabled={saving || !email.trim()}>{saving ? 'Saving…' : 'Save alerts'}</Button>
        </div>
        {!data?.emailProviderReady ? <p className="mt-3 text-sm text-[#9a5717] sm:text-[12px]">In-app review remains active. Production email starts when the approved sender is connected.</p> : null}
      </div>

      <div className="mt-4 space-y-3">
        {loading && !data ? <p className="text-sm text-[#5c6674]">Loading identity reviews…</p> : null}
        {!loading && openConflicts.length === 0 ? <div className="flex items-center gap-3 rounded-xl border border-[#b9dfce] bg-[#f0fbf6] px-4 py-4 text-sm text-[#176c49]"><CheckCircle2 className="h-5 w-5" />No unresolved Nabis identity conflicts.</div> : null}
        {openConflicts.map((conflict) => {
          const isActing = actingId === conflict.id;
          const isConfirming = confirm?.id === conflict.id;
          return <article key={conflict.id} className="rounded-xl border border-[#efc58d] bg-[#fffaf1] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ae6114]" /><div>
                <p className="font-semibold text-[#352818]">{conflict.metadata.incomingAccountName}</p>
                <p className="mt-1 text-sm text-[#6c5537]">Current CRM owner: {conflict.metadata.currentOwnerAccountName ?? 'none'} · seen {conflict.metadata.occurrenceCount} time{conflict.metadata.occurrenceCount === 1 ? '' : 's'}</p>
                <p className="mt-1 text-sm text-[#826846] sm:text-[12px]">Last detected {dateTime(conflict.metadata.lastDetectedAt)}</p>
                <p className="mt-2 text-sm text-[#6c5537] sm:text-[12px]">Nabis retailer {conflict.metadata.sourceIdentifiers.nabisRetailerId ?? 'unknown'} · license {conflict.metadata.sourceIdentifiers.licenseNumber ?? 'unknown'}</p>
              </div></div>
              <Badge variant={conflict.metadata.email.status === 'SENT' ? 'success' : 'warning'}>email {conflict.metadata.email.status.toLowerCase()}</Badge>
            </div>
            {isConfirming ? <div className="mt-4 rounded-xl border border-[#d8b477] bg-white p-3">
              <p className="text-sm font-semibold text-[#352818]">{confirm.decision === 'KEEP_CURRENT_OWNER' ? `Keep ${conflict.metadata.currentOwnerAccountName ?? 'the current CRM owner'}?` : `Transfer the CRM page to ${conflict.metadata.incomingAccountName}?`}</p>
              <p className="mt-1 text-sm text-[#6c5537] sm:text-[12px]">This records an explicit identity override and audit event. Future syncs follow your decision.</p>
              <div className="mt-3 flex gap-2"><Button type="button" className="bg-[#24324f] text-white hover:bg-[#1c2840]" onClick={() => void runAction({ action: 'resolve', notificationId: conflict.id, decision: confirm.decision }, 'Identity conflict resolved.')} disabled={isActing}>{isActing ? 'Resolving…' : 'Confirm decision'}</Button><Button type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={isActing}>Cancel</Button></div>
            </div> : <div className="mt-4 flex flex-wrap gap-2">
              {conflict.metadata.currentOwnerAccountName ? <Button type="button" variant="secondary" onClick={() => setConfirm({ id: conflict.id, decision: 'KEEP_CURRENT_OWNER' })}>Keep current owner</Button> : null}
              <Button type="button" className="bg-[#24324f] text-white hover:bg-[#1c2840]" onClick={() => setConfirm({ id: conflict.id, decision: 'TRANSFER_TO_INCOMING' })}>Transfer to Nabis account</Button>
              {conflict.metadata.email.status !== 'SENT' ? <Button type="button" variant="ghost" onClick={() => void runAction({ action: 'retry-email', notificationId: conflict.id }, 'Conflict email retried.')} disabled={isActing || !data?.emailProviderReady}>Retry email</Button> : null}
            </div>}
          </article>;
        })}
      </div>

      {resolvedConflicts.length ? <details className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f7f9fc] px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-[#38404d]">Recent resolved reviews ({resolvedConflicts.length})</summary><div className="mt-3 space-y-2">{resolvedConflicts.map((conflict) => <div key={conflict.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px] text-[#5c6674]"><span>{conflict.metadata.incomingAccountName}</span><span>{conflict.metadata.resolution?.decision === 'TRANSFER_TO_INCOMING' ? 'Transferred' : 'Kept current owner'} · {dateTime(conflict.metadata.resolution?.resolvedAt)}</span></div>)}</div></details> : null}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex h-11 items-center gap-2 rounded-xl border border-[#cbd2dc] bg-white px-3 text-sm font-medium text-[#38404d]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} className="h-4 w-4 accent-[#1d5eea]" />{label}</label>;
}
