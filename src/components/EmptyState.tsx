import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface CTA {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "secondary";
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primary?: CTA;
  secondary?: CTA;
  className?: string;
}

/**
 * Friendly empty-state card for modules that have no data yet.
 * Themed via design tokens — never use raw colors.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  className,
}: EmptyStateProps) => {
  const renderCta = (cta: CTA, isPrimary: boolean) => {
    const Comp = (
      <Button
        size="lg"
        variant={cta.variant ?? (isPrimary ? "default" : "outline")}
        onClick={cta.onClick}
      >
        {cta.icon}
        {cta.label}
      </Button>
    );
    if (cta.href) {
      return (
        <a href={cta.href} className="inline-flex">
          {Comp}
        </a>
      );
    }
    return Comp;
  };

  return (
    <Card
      className={`p-10 md:p-14 text-center border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 ${className ?? ""}`}
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {description}
      </p>
      {(primary || secondary) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {primary && renderCta(primary, true)}
          {secondary && renderCta(secondary, false)}
        </div>
      )}
    </Card>
  );
};

export default EmptyState;
