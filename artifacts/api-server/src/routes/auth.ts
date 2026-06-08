import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { actor } from '../middleware/actor.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0]?.message ?? 'Dados inválidos' });
    return;
  }

  const { username, password } = parse.data;
  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
    return;
  }

  const { passwordHash: _, ...userSafe } = user;
  res.json(userSafe);
});

authRouter.get('/me', actor, async (req, res) => {
  const user = await db.user.findUnique({ where: { username: req.actor!.username } });
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }
  const { passwordHash: _, ...userSafe } = user;
  res.json(userSafe);
});
