import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, MessageCircle, Phone, Home, Star } from "lucide-react";
import { whatsAppLink, normalizeWhatsAppNumber } from "@/lib/whatsapp";

export interface OrgMember {
  id: string;
  role: string;
  assignedRoles?: string[];
  house_name: string | null;
  is_house_representative: boolean;
  profiles: { full_name: string; email: string | null; phone: string | null; avatar_url: string | null };
}

const TIERS: { key: string; roles: string[] }[] = [
  { key: "executive", roles: ["family_head", "family_admin"] },
  { key: "finance", roles: ["treasurer", "loan_committee"] },
  { key: "secretariat", roles: ["secretary"] },
];

function rolesOf(m: OrgMember) {
  return new Set([m.role, ...(m.assignedRoles ?? [])]);
}

function Contact({ m }: { m: OrgMember }) {
  const { t } = useTranslation();
  const wa = normalizeWhatsAppNumber(m.profiles.phone);
  return (
    <div className="flex gap-1">
      {wa && (
        <a aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-primary hover:bg-muted"
          href={whatsAppLink(t("whatsapp.memberHello", { name: m.profiles.full_name }), wa)}>
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
      {m.profiles.phone && <a aria-label="Phone" className="rounded-md p-1.5 text-primary hover:bg-muted" href={`tel:${m.profiles.phone}`}><Phone className="h-4 w-4" /></a>}
      {m.profiles.email && <a aria-label="Email" className="rounded-md p-1.5 text-primary hover:bg-muted" href={`mailto:${m.profiles.email}`}><Mail className="h-4 w-4" /></a>}
    </div>
  );
}

function Person({ m, badge }: { m: OrgMember; badge?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={m.profiles.avatar_url || undefined} />
        <AvatarFallback>{m.profiles.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.profiles.full_name}</p>
        {badge && <p className="truncate text-xs text-muted-foreground">{badge}</p>}
      </div>
      <Contact m={m} />
    </div>
  );
}

export function GovernanceOrganigram({ members, roleLabel }: { members: OrgMember[]; roleLabel: (r: string) => string }) {
  const { t } = useTranslation();
  const placed = new Set<string>();

  const tiers = TIERS.map((tier) => {
    const people = members.filter((m) => tier.roles.some((r) => rolesOf(m).has(r)));
    people.forEach((p) => placed.add(p.id));
    return { ...tier, people };
  });

  const houses = new Map<string, OrgMember[]>();
  members.forEach((m) => {
    const h = m.house_name?.trim() || t("organigram.noHouse");
    houses.set(h, [...(houses.get(h) ?? []), m]);
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {tiers.map((tier) => (
          <Card key={tier.key} className="p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t(`organigram.tier.${tier.key}`)}</h3>
            {tier.people.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("organigram.vacant")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tier.people.map((m) => (
                  <Person key={m.id} m={m} badge={[...rolesOf(m)].filter((r) => tier.roles.includes(r)).map(roleLabel).join(" · ")} />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">{t("organigram.houses")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[...houses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([house, list]) => (
            <Card key={house} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /><span className="font-medium">{house}</span></div>
                <Badge variant="secondary">{t("organigram.memberCount", { count: list.length })}</Badge>
              </div>
              <div className="space-y-2">
                {[...list].sort((a, b) => Number(b.is_house_representative) - Number(a.is_house_representative)).map((m) => (
                  <div key={m.id} className="relative">
                    {m.is_house_representative && <Star className="absolute -left-1 -top-1 h-4 w-4 fill-accent text-accent" aria-label={t("organigram.rep")} />}
                    <Person m={m} badge={m.is_house_representative ? t("organigram.rep") : roleLabel(m.role)} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
