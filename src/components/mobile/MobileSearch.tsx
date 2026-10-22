import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, LayoutGrid, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Result { id: string; kind: 'member' | 'meeting' | 'page'; title: string; subtitle?: string; path: string; }

interface Props { familyId?: string; familySlug?: string; }

export function MobileSearch({ familyId, familySlug }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const pages = familySlug ? [
    { key: 'members', label: t('mobileHome.members') },
    { key: 'meetings', label: t('nav.meetings') },
    { key: 'contributions', label: t('nav.finance') },
    { key: 'payment-proofs', label: t('mobileHome.pay') },
    { key: 'loans', label: t('mobileHome.loans') },
    { key: 'savings', label: t('mobileHome.savings') },
    { key: 'assistance', label: t('mobileHome.assistance') },
    { key: 'chat', label: t('mobileSearch.chat') },
    { key: 'calendar', label: t('mobileSearch.calendar') },
    { key: 'reports', label: t('mobileHome.reports') },
  ] : [];

  useEffect(() => {
    const q = term.trim();
    if (!familyId || !familySlug || q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const safe = q.replace(/[%,()]/g, ' ');
      const [membersRes, meetingsRes] = await Promise.all([
        supabase.from('family_members')
          .select('id, role, house_name, profiles!inner(full_name)')
          .eq('family_id', familyId)
          .ilike('profiles.full_name', `%${safe}%`)
          .limit(5),
        supabase.from('meetings')
          .select('id, meeting_type, meeting_date, location, agenda')
          .eq('family_id', familyId)
          .or(`meeting_type.ilike.%${safe}%,location.ilike.%${safe}%,agenda.ilike.%${safe}%`)
          .order('meeting_date', { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      const lower = q.toLowerCase();
      const out: Result[] = [
        ...(membersRes.data ?? []).map((m: any) => ({
          id: `m-${m.id}`, kind: 'member' as const, title: m.profiles?.full_name ?? '',
          subtitle: [m.role?.replace(/_/g, ' '), m.house_name].filter(Boolean).join(' · '),
          path: `/family/${familySlug}/members/${m.id}`,
        })),
        ...(meetingsRes.data ?? []).map((m: any) => ({
          id: `e-${m.id}`, kind: 'meeting' as const, title: m.meeting_type,
          subtitle: [new Date(m.meeting_date).toLocaleDateString(), m.location].filter(Boolean).join(' · '),
          path: `/family/${familySlug}/meetings`,
        })),
        ...pages.filter((p) => p.label.toLowerCase().includes(lower)).map((p) => ({
          id: `p-${p.key}`, kind: 'page' as const, title: p.label, path: `/family/${familySlug}/${p.key}`,
        })),
      ];
      setResults(out);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, familyId, familySlug]);

  const icon = (k: Result['kind']) => k === 'member' ? User : k === 'meeting' ? Calendar : LayoutGrid;
  const open = term.trim().length >= 2;

  return (
    <div className="relative mt-4">
      <form onSubmit={(e) => { e.preventDefault(); if (results[0]) navigate(results[0].path); }}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('mobileHome.search')}
          aria-label={t('mobileHome.search')}
          className="h-12 w-full rounded-2xl bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </form>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-14 z-40 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card p-2 text-foreground shadow-xl">
          {loading && results.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('mobileSearch.searching')}</div>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{t('mobileSearch.noResults')}</p>
          ) : results.map((r) => {
            const Icon = icon(r.kind);
            return (
              <button key={r.id} role="option" onClick={() => navigate(r.path)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-muted">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  {r.subtitle && <span className="block truncate text-xs capitalize text-muted-foreground">{r.subtitle}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MobileSearch;
