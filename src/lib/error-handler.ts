import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }

  console.error('Unknown error:', error);
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}

export function createValidationError(message: string, details?: Record<string, unknown>): ApiError {
  return new ApiError(400, 'VALIDATION_ERROR', message, details);
}

export function createUnauthorizedError(message: string = 'Unauthorized'): ApiError {
  return new ApiError(401, 'UNAUTHORIZED', message);
}

export function createForbiddenError(message: string = 'Forbidden'): ApiError {
  return new ApiError(403, 'FORBIDDEN', message);
}

export function createNotFoundError(message: string = 'Not found'): ApiError {
  return new ApiError(404, 'NOT_FOUND', message);
}

export function createConflictError(message: string): ApiError {
  return new ApiError(409, 'CONFLICT', message);
}

export function createRateLimitError(message: string = 'Too many requests'): ApiError {
  return new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
}

export function createInternalServerError(message: string = 'Internal server error'): ApiError {
  return new ApiError(500, 'INTERNAL_ERROR', message);
}
