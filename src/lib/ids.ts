import { randomBytes } from "crypto";

const ALPHABET = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const ID_LENGTHS = { short: 8, long: 22 };

export function randomId(length: number = ID_LENGTHS.short): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

  let id = "";
  while (id.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= limit) continue;
      id += ALPHABET[byte % ALPHABET.length];
      if (id.length === length) break;
    }
  }
  return id;
}
