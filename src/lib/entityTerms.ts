/**
 * Entity vocabulary: the app serves families, associations/communities and
 * tontine (njangi) groups. Labels resolve through i18n keys under `entity.*`
 * so each group type sees tailored wording without code forks.
 */
export type EntityType = "family" | "association" | "tontine";

export const ENTITY_TYPES: EntityType[] = ["family", "association", "tontine"];

export function normalizeEntityType(value?: string | null): EntityType {
  return ENTITY_TYPES.includes(value as EntityType)
    ? (value as EntityType)
    : "family";
}

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export type EntityTerm = "singular" | "plural" | "member" | "members";

/** Localized label for a group term, e.g. entityTerm("tontine", t, "members"). */
export function entityTerm(
  entityType: string | null | undefined,
  t: TFunction,
  term: EntityTerm,
): string {
  return t(`entity.${normalizeEntityType(entityType)}.${term}`);
}
