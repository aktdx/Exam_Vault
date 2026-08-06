const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function buildApiUrl(path: string): string {
  if (!path) return path;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolvedInput = typeof input === 'string' ? buildApiUrl(input) : input;
  return fetch(resolvedInput, init);
}
