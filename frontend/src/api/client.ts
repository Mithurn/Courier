export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
