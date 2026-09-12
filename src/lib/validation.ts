const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

export const MAX_TTL_SECONDS = 30 * 86400;

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export class ConflictError extends Error {}

export function parseDuration(input: unknown): number {
  const raw = String(input).trim();
  const match = /^(\d+)\s*([smhdw])?$/i.exec(raw);

  if (!match) {
    throw new ValidationError(`cannot read expiresIn "${raw}" (try 600, 10m, 2h, 7d)`);
  }

  const seconds = Number(match[1]) * UNITS[(match[2] ?? "s").toLowerCase()];

  if (seconds <= 0) {
    throw new ValidationError("expiresIn must be greater than zero");
  }
  if (seconds > MAX_TTL_SECONDS) {
    throw new ValidationError("expiresIn must be 30 days or less");
  }
  return seconds;
}

export function parseMaxViews(input: unknown): number {
  const views = Number(input);

  if (!Number.isInteger(views) || views < 1) {
    throw new ValidationError("maxViews must be a whole number of at least 1");
  }
  return views;
}

const CUSTOM_ID = /^[A-Za-z0-9_-]{3,64}$/;

const RESERVED_IDS = new Set([
  "api",
  "raw",
  "new",
  "about",
  "health",
  "admin",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function parseCustomId(input: unknown): string {
  const id = String(input).trim();

  if (!CUSTOM_ID.test(id)) {
    throw new ValidationError(
      "custom URL must be 3 to 64 characters of letters, numbers, dashes or underscores",
    );
  }
  if (RESERVED_IDS.has(id.toLowerCase())) {
    throw new ValidationError(`"${id}" is reserved and cannot be used`);
  }
  return id;
}

export function parseOptionalText(input: unknown, field: string, maxLength: number): string | null {
  if (input == null || input === "") return null;

  const text = String(input).trim();
  if (text.length === 0) return null;

  if (text.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or less`);
  }
  return text;
}
