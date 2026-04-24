import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type Level = { score: number; label: string; barClass: string; textClass: string };

const evaluate = (pw: string): Level => {
  if (!pw) return { score: 0, label: "", barClass: "bg-muted", textClass: "text-muted-foreground" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", barClass: "bg-destructive", textClass: "text-destructive" };
  if (score === 2) return { score: 2, label: "Fair", barClass: "bg-accent", textClass: "text-accent" };
  if (score === 3) return { score: 3, label: "Good", barClass: "bg-secondary", textClass: "text-secondary-foreground" };
  return { score: 4, label: "Strong", barClass: "bg-primary", textClass: "text-primary" };
};

export const PasswordStrength = ({ password, className }: PasswordStrengthProps) => {
  const level = useMemo(() => evaluate(password), [password]);
  if (!password) return null;

  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={level.score} aria-label="Password strength">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= level.score ? level.barClass : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", level.textClass)}>
        Password strength: {level.label}
      </p>
    </div>
  );
};

export default PasswordStrength;
