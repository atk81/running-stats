export interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}

export class ApiMutationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorBody["details"];
  readonly retryAfter?: number;

  constructor(
    code: string,
    status: number,
    message: string,
    extras: { details?: ApiErrorBody["details"]; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "ApiMutationError";
    this.code = code;
    this.status = status;
    this.details = extras.details;
    this.retryAfter = extras.retryAfter;
  }
}

export async function parseApiError(
  res: Response,
  fallbackCode = "request_failed",
): Promise<ApiMutationError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiMutationError(
    body?.error ?? fallbackCode,
    res.status,
    body?.message ?? `Request failed (${res.status})`,
    { details: body?.details, retryAfter: body?.retryAfter },
  );
}

export function formatApiError(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof ApiMutationError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.field}: ${d.message}`).join(" · ");
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return null;
}
