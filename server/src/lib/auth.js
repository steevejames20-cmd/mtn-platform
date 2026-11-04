import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET manquant dans les variables d’environnement');
  return s;
}

export function signToken(payload, expiresIn) {
  return jwt.sign(payload, secret(), { expiresIn });
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Vérifie un jeton et contrôle sa portée (`admin` ou `history`) */
function requireScope(scope) {
  return (req, _res, next) => {
    const token = readBearer(req);
    if (!token) return next(new HttpError(401, 'Authentification requise'));
    try {
      const payload = jwt.verify(token, secret());
      if (payload.scope !== scope) throw new Error('scope');
      req.auth = payload;
      next();
    } catch {
      next(new HttpError(401, 'Session expirée ou invalide, veuillez vous reconnecter'));
    }
  };
}

export const requireAdmin = requireScope('admin');
export const requireHistory = requireScope('history');
