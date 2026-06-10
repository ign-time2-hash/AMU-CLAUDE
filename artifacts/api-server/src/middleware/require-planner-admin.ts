import type { NextFunction, Request, Response } from 'express';

export function requirePlannerAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor || actor.role !== 'planejador' || !actor.isPlannerAdmin) {
      res.status(403).json({ error: 'Operação restrita ao planejador administrador' });
      return;
    }
    next();
  };
}
