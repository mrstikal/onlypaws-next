/**
 * Centralized API response utilities for consistent error handling
 */

import { NextResponse } from 'next/server';

/**
 * Create a standardized error response
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with error
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Create a validation errors response
 * @param errors - Record of field names to error messages
 * @returns NextResponse with validation errors
 */
export function validationErrors(errors: Record<string, string>) {
  return NextResponse.json({ ok: false, errors }, { status: 422 });
}

/**
 * Create a success response
 * @param data - Response data
 * @returns NextResponse with success
 */
export function successResponse<T>(data: T) {
  return NextResponse.json({ ok: true, ...data });
}

/**
 * Create an unauthorized response
 * @param message - Optional error message
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message: string = 'Neautorizováno') {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

/**
 * Create a not found response
 * @param message - Optional error message
 * @returns NextResponse with 404 status
 */
export function notFoundResponse(message: string = 'Nenalezeno') {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

