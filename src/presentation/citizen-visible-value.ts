import { CITIZEN_DOES_NOT_HAVE } from "../incident/schema";

export function isInternalCaseValue(value: unknown): boolean {
  return (
    value === CITIZEN_DOES_NOT_HAVE ||
    value === "UNKNOWN" ||
    (typeof value === "string" &&
      (/^__[A-Z0-9_]+__$/.test(value) ||
        /^(?:synthetic|demo|placeholder)\b/i.test(value) ||
        /^(?:fake bank|fake payment provider)\b/i.test(value)))
  );
}

export function citizenVisibleValue(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed && !isInternalCaseValue(trimmed) ? trimmed : null;
}
