export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseApiError(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const err = (body as { error?: unknown }).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'fieldErrors' in err) {
    const fieldErrors = (err as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    if (fieldErrors?.body?.[0]) return 'Email body is too large. Remove or shrink image attachments.';
    const first = Object.values(fieldErrors ?? {}).flat()[0];
    if (first) return first;
  }
  return '';
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = parseApiError(body) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
