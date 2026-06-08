let currentUsername: string | null = null;

export function setCurrentUsername(u: string | null): void {
  currentUsername = u;
}

function getActor(): string {
  if (!currentUsername) throw new Error('Não autenticado');
  return currentUsername;
}

async function handleResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    try {
      const json = (await resp.json()) as { error?: string };
      msg = json.error ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('actorUsername', getActor());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(url.toString());
  return handleResponse<T>(resp);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorUsername: getActor(), ...(body as object ?? {}) }),
  });
  return handleResponse<T>(resp);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorUsername: getActor(), ...(body as object ?? {}) }),
  });
  return handleResponse<T>(resp);
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('actorUsername', getActor());
  const resp = await fetch(url.toString(), { method: 'DELETE' });
  return handleResponse<T>(resp);
}
