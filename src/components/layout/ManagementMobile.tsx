import { Children, Fragment, isValidElement, useState, type ReactNode, type ReactElement, type HTMLAttributes } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevice } from "@/hooks/useDevice";
import { PageHeader } from "./PageHeader";
import { DataCards } from "./DataCards";
import { BottomActionBar } from "./BottomActionBar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";

type Element = ReactElement<{ children?: ReactNode; colSpan?: number; onClick?: () => void }>;
function elements(children: ReactNode): Element[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return child.type === Fragment ? elements(child.props.children) : [child as Element];
  });
}

/** Adapts already-rendered rows, preserving their parent-owned handlers and guards. */
export function ManagementTable({ children, ...props }: HTMLAttributes<HTMLTableElement>) {
  const { isMobile } = useDevice();
  const { t } = useTranslation();
  if (!isMobile) return <table {...props}>{children}</table>;
  const sections = elements(children);
  const heads = sections.filter(section => section.type === "thead").flatMap(section => elements(section.props.children)).flatMap(row => elements(row.props.children));
  const rows = sections.filter(section => section.type === "tbody").flatMap(section => elements(section.props.children));
  const fullRows = rows.filter(row => elements(row.props.children).length > 1);
  const emptyRows = rows.filter(row => elements(row.props.children).length === 1);
  return <DataCards rows={fullRows} getRowKey={row => String(row.key ?? rows.indexOf(row))}
    title={row => elements(row.props.children)[0]?.props.children}
    columns={heads.slice(1).map((head, index) => ({ key: String(index), label: "", render: (row: Element) => {
      const cells = elements(row.props.children);
      const cell = cells[index + 1];
      if (!cell) return null;
      const action = index + 1 === heads.length - 1 && /action/i.test(String(head.props.children)) || index + 1 === heads.length - 1 && containsControl(cell.props.children);
      return <div className="pointer-events-auto min-w-0"><div className="mb-1 text-xs text-muted-foreground">{head.props.children}</div>{action ? <Popover><PopoverTrigger asChild><Button variant="outline" size="icon" aria-label={t("foundation.moreActions")}><MoreVertical className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent align="end" className="management-row-actions w-auto max-w-full">{cell.props.children}</PopoverContent></Popover> : cell.props.children}</div>;
    } }))}
    emptyState={<>{emptyRows.map(row => <Fragment key={row.key}>{elements(row.props.children)[0]?.props.children}</Fragment>)}</>}
  />;
}
function containsControl(children: ReactNode): boolean {
  return elements(children).some(child => {
    const component = child.type as { displayName?: string; name?: string };
    const name = typeof child.type === "string" ? child.type : component.displayName ?? component.name ?? "";
    return /button|dialog|menu|receipt/i.test(name) || containsControl(child.props.children);
  });
}

/** Keeps existing header controls mounted in a sheet without duplicating their logic. */
export function ManagementHeader({ title, children, onCreate, createLabel, className, as = "div" }: { title: string; children: ReactNode; onCreate?: () => void; createLabel?: string; className?: string; as?: "div" | "header" }) {
  const { isMobile } = useDevice();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const Tag = as;
  if (!isMobile) return <Tag className={className}>{children}</Tag>;
  return <>
    <PageHeader title={title} backTo={true} actions={[{ key: "controls", label: t("foundation.moreActions"), icon: MoreVertical, onClick: () => setOpen(true) }]} />
    {!open && <div className="hidden" aria-hidden="true">{children}</div>}
    <ResponsiveDialog open={open} onOpenChange={setOpen}><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>{t("foundation.moreActions")}</ResponsiveDialogTitle></ResponsiveDialogHeader><div className="management-header-controls space-y-4 py-4">{children}</div></ResponsiveDialogContent></ResponsiveDialog>
    {onCreate && createLabel && <BottomActionBar className="management-create-bar"><Button onClick={onCreate}><Plus className="h-5 w-5" />{createLabel}</Button></BottomActionBar>}
  </>;
}