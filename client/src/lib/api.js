const ADMIN_TOKEN_KEY = 'nc_admin_token';
const HISTORY_TOKEN_KEY = 'nc_history_token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function storageGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* stockage indisponible : la session reste en mémoire uniquement */
  }
}

export const tokens = {
  admin: () => storageGet(ADMIN_TOKEN_KEY),
  setAdmin: (t) => storageSet(ADMIN_TOKEN_KEY, t),
  history: () => storageGet(HISTORY_TOKEN_KEY),
  setHistory: (t) => storageSet(HISTORY_TOKEN_KEY, t),
};

let onAdminUnauthorized = null;
export const setAdminUnauthorizedHandler = (fn) => (onAdminUnauthorized = fn);

/**
 * Appel à l'API. `auth` vaut 'admin' ou 'history' pour joindre le jeton correspondant.
 */
export async function api(path, { method = 'GET', body, auth, query } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth === 'admin' ? tokens.admin() : auth === 'history' ? tokens.history() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let url = `/api${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...qs].length) url += `?${qs}`;
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez que l’API est démarrée.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth === 'admin' && onAdminUnauthorized) onAdminUnauthorized();
    throw new ApiError(res.status, data.error || `Erreur ${res.status}`, data.details);
  }
  return data;
}
