const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

export const MAX_TTL_SECONDS = 30 * 86400;

export class ValidationError extends Error {}

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
