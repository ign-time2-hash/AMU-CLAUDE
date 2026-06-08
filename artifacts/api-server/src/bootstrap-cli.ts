import './load-env.js';
import { runBootstrap } from './bootstrap.js';
import { db } from './db.js';

runBootstrap()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Bootstrap falhou:', err);
    process.exit(1);
  });
