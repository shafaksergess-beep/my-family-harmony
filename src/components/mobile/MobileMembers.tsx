import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, Download, Shield, RefreshCw, Users, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataCards } from "@/components/layout/DataCards";
import { StatCarousel } from "@/components/layout/StatCarousel";
import { SegmentedTabs, SegmentedTabsList, SegmentedTabsTrigger, SegmentedTabsContent } from "@/components/layout/SegmentedTabs";
import { AnalyticsFilters } from "@/components/analytics/MobileAnalytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OfflineIndicator } from "./OfflineIndicator";
import { GovernanceOrganigram } from "@/components/family/GovernanceOrganigram";
import { canShowMemberActions } from "@/lib/memberManagement";

export interface ManagementMember {
  id: string; user_id: string; role: string; house_name: string | null; is_house_representative: boolean;
  assignedRoles: string[];
  profiles: { full_name: string; email: string | null; phone: string | null; avatar_url: string | null; is_working: boolean };
}
interface Props {
  members: ManagementMember[]; allMembers: ManagementMember[]; familyName: string; userId: string | null;
  canManageMembers: boolean; search: string; onSearch: (value: string) => void;
  roleFilter: string; onRoleFilter: (value: string) => void; roles: { key: string; label: string }[];
  roleLabel: (role: string) => string; view: "list" | "org"; onView: (view: "list" | "org") => void;
  onAdd: () => void; onExport: () => void; onRefresh: () => void;
  onRoles: (member: ManagementMember) => void; onEdit: (member: ManagementMember) => void; onRemove: (member: ManagementMember) => void;
  error?: ReactNode;
}
/** Presentation only: Members owns all reads, authorization and mutations. */
export function MobileMembers(props: Props) {
  const { t } = useTranslation(); const navigate = useNavigate(); const { familySlug } = useParams();
  const { members, allMembers, roleLabel, canManageMembers } = props;
  const houses = new Set(allMembers.map(m => m.house_name).filter(Boolean)).size;
  return <div className="min-w-0 bg-background">
    <OfflineIndicator />
    <PageHeader title={t("famMembers.familyMembers")} subtitle={props.familyName} backTo={`/family/${familySlug}`} actions={[
      { key: "add", label: t("famMembers.addMember"), icon: Plus, primary: true, hidden: !canManageMembers, onClick: props.onAdd },
      { key: "export", label: t("famMembers.export"), icon: Download, disabled: !members.length, onClick: props.onExport },
      { key: "roles", label: t("famMembers.roleManagement"), icon: Shield, hidden: !canManageMembers, onClick: () => navigate(`/family/${familySlug}/role-management`) },
      { key: "refresh", label: t("phase3.refresh"), icon: RefreshCw, onClick: props.onRefresh },
    ]} />
    <main className="space-y-4 p-4">
      <StatCarousel items={[
        { key: "members", label: t("mobilePolish.members"), value: allMembers.length, icon: Users },
        { key: "houses", label: t("phase3.houses"), value: houses },
        { key: "representatives", label: t("famMembers.houseRepresentative"), value: allMembers.filter(m => m.is_house_representative).length },
      ]} />
      {props.error}
      <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="pl-10 text-base" aria-label={t("famMembers.searchByNameEmailOr")} placeholder={t("famMembers.searchByNameEmailOr")} value={props.search} onChange={e => props.onSearch(e.target.value)} autoComplete="off" /></div>
      <AnalyticsFilters chips={[
        ...(props.roleFilter !== "all" ? [{ key: "role", label: roleLabel(props.roleFilter), clear: () => props.onRoleFilter("all") }] : []),
        ...(props.search ? [{ key: "search", label: props.search, clear: () => props.onSearch("") }] : []),
      ]}>
        <label className="space-y-2"><span className="text-sm font-medium">{t("famMembers.filterByRole")}</span><Select value={props.roleFilter} onValueChange={props.onRoleFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("famMembers.allRoles")}</SelectItem>{props.roles.map(role => <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>)}</SelectContent></Select></label>
      </AnalyticsFilters>
      <SegmentedTabs value={props.view} onValueChange={value => props.onView(value === "org" ? "org" : "list")}>
        <SegmentedTabsList><SegmentedTabsTrigger value="list">{t("organigram.listView")}</SegmentedTabsTrigger><SegmentedTabsTrigger value="org">{t("organigram.orgView")}</SegmentedTabsTrigger></SegmentedTabsList>
        <SegmentedTabsContent value="list">
          <DataCards rows={members} getRowKey={m => m.id}
            title={m => <span className="flex min-w-0 items-center gap-2"><Avatar className="h-10 w-10 shrink-0"><AvatarImage src={m.profiles.avatar_url ?? undefined} /><AvatarFallback><User className="h-5 w-5" /></AvatarFallback></Avatar><span className="truncate">{m.profiles.full_name}</span></span>}
            subtitle={m => m.profiles.email || m.profiles.phone || ""}
            status={m => <div className="flex flex-wrap gap-1">{m.assignedRoles.map(role => <Badge key={role} variant="outline">{roleLabel(role)}</Badge>)}{m.is_house_representative && <Badge variant="secondary">{t("famMembers.houseRep")}</Badge>}</div>}
            columns={[{ key: "house", label: t("famMembers.houseName"), render: m => m.house_name || t("phase3.notAssigned") }]}
            onRowClick={m => navigate(`/family/${familySlug}/members/${m.id}`)}
            actions={m => canShowMemberActions(canManageMembers, m.user_id, props.userId) ? [
              { key: "roles", label: t("famMembers.roles"), onClick: () => props.onRoles(m) },
              { key: "edit", label: t("famMembers.edit"), onClick: () => props.onEdit(m) },
              { key: "remove", label: t("famMembers.remove"), onClick: () => props.onRemove(m) },
            ] : []}
            emptyState={<div className="space-y-3"><Users className="mx-auto h-10 w-10 text-muted-foreground" /><p>{t("famMembers.noMembersFound")}</p>{(props.search || props.roleFilter !== "all") && <Button variant="outline" onClick={() => { props.onSearch(""); props.onRoleFilter("all"); }}>{t("phase3.clearFilters")}</Button>}</div>}
          />
        </SegmentedTabsContent>
        <SegmentedTabsContent value="org"><GovernanceOrganigram members={members} roleLabel={roleLabel} /></SegmentedTabsContent>
      </SegmentedTabs>
    </main>
  </div>;
}
