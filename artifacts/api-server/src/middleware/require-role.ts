import { type Request, type Response, type NextFunction } from 'express';
import { type UserRole } from '@amu/db';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.actor) {
      res.status(400).json({ error: 'actorUsername é obrigatório' });
      return;
    }
    if (!roles.includes(req.actor.role)) {
      res.status(403).json({ error: 'Acesso não autorizado para este papel' });
      return;
    }
    next();
  };
}
