export class TimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export const withTimeout = async <T extends PromiseLike<unknown>>(
  promise: T,
  timeoutMs: number,
  label = 'Async operation'
): Promise<Awaited<T>> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]) as Awaited<T>;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const isTimeoutError = (error: unknown): error is TimeoutError => {
  return error instanceof TimeoutError || (error instanceof Error && error.name === 'TimeoutError');
};
