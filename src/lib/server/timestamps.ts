export function now(): Date {
  return new Date();
}

export function stampCreate(date: Date = now()): { created_at: Date; updated_at: Date } {
  return {
    created_at: date,
    updated_at: date,
  };
}

export function stampUpdate(date: Date = now()): { updated_at: Date } {
  return {
    updated_at: date,
  };
}

