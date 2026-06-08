import './load-env.js';
import { db } from './db.js';

async function verify(): Promise<void> {
  const [users, setores, labs, equipamentos, chamados] = await Promise.all([
    db.user.count(),
    db.setor.count(),
    db.lab.count(),
    db.equipamento.count(),
    db.chamado.count(),
  ]);

  console.log('--- Verificação do Seed ---');
  console.log(`Usuarios:      ${users}`);
  console.log(`Setores:       ${setores}`);
  console.log(`Laboratorios:  ${labs}`);
  console.log(`Equipamentos:  ${equipamentos}`);
  console.log(`Chamados:      ${chamados}`);
  console.log('----------------------------');
}

verify()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
