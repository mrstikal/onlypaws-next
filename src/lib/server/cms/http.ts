import { ApiError, ValidationError } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export function cmsJsonError(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        fields: error.fields,
      },
      { status: error.status }
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    { error: 'Interni chyba serveru', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

