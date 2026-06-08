import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../db.js';

export async function actor(req: Request, res: Response, next: NextFunction): Promise<void> {
  const actorUsername =
    (req.body as Record<string, unknown>)?.actorUsername as string | undefined ??
    (req.query['actorUsername'] as string | undefined);

  if (!actorUsername) {
    res.status(400).json({ error: 'actorUsername é obrigatório' });
    return;
  }

  const user = await db.user.findUnique({ where: { username: actorUsername } });
  if (!user) {
    res.status(403).json({ error: 'Usuário não autorizado' });
    return;
  }

  req.actor = { username: user.username, name: user.name, role: user.role };
  next();
}
