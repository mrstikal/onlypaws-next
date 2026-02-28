export function parseBigIntParam(raw: unknown): bigint | null {
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

export function bigIntToString(value: unknown): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

