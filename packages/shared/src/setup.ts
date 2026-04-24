export type CoupleRole = "self" | "partner";

export interface InitializeCoupleInput {
  coupleName: string;
  selfName: string;
  partnerName: string;
}

export interface InitializeCoupleResult {
  coupleId: string;
  selfUserId: string;
  partnerUserId: string;
  inviteCode: string;
}

export interface SetupStatus {
  configured: boolean;
  coupleName: string | null;
  memberCount: number;
}

function normalizeName(value: unknown, fieldName: keyof InitializeCoupleInput): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (trimmed.length > 40) {
    throw new Error(`${fieldName} must be 40 characters or fewer`);
  }

  return trimmed;
}

export function parseInitializeCoupleInput(input: unknown): InitializeCoupleInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("setup input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    coupleName: normalizeName(record.coupleName, "coupleName"),
    selfName: normalizeName(record.selfName, "selfName"),
    partnerName: normalizeName(record.partnerName, "partnerName")
  };
}
