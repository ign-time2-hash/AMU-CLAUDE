import './load-env.js';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { logger } from './logger.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function runBootstrap(): Promise<void> {
  logger.info('Iniciando bootstrap do banco...');

  try {
    const schemaPath = resolve(__dirname, '../../../lib/db/prisma/schema.prisma');
    execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    logger.info('Schema aplicado com sucesso.');
  } catch (err) {
    logger.warn({ err }, 'db push falhou (pode ser normal se banco já está atualizado)');
  }

  await seed();
  logger.info('Bootstrap concluido.');
}

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('kronus2026', 10);

  await db.user.upsert({
    where: { username: 'planejador' },
    create: { username: 'planejador', passwordHash, name: 'Carlos Silva', jobTitle: 'Planejador de Manutenção', role: 'planejador' },
    update: {},
  });

  await db.user.upsert({
    where: { username: 'cliente' },
    create: { username: 'cliente', passwordHash, name: 'Funcionário de Laboratório', jobTitle: 'Pesquisador', role: 'cliente' },
    update: {},
  });

  await db.user.upsert({
    where: { username: 'tecnico' },
    create: { username: 'tecnico', passwordHash, name: 'Técnico Externo', jobTitle: 'Técnico de Manutenção', role: 'tecnico_externo' },
    update: {},
  });

  // Seed mapas
  const mapasCenpes = [
    { slug: 'cenpes-1', name: 'Cenpes 1', imagePath: '/maps/cenpes-1-map-v2-transparent.png', cenpes: 'cenpes_1' as const },
    { slug: 'cenpes-2', name: 'Cenpes 2', imagePath: '/maps/cenpes-1-map-transparent.png', cenpes: 'cenpes_2' as const },
  ];

  const mapas: { id: number; slug: string; cenpes: 'cenpes_1' | 'cenpes_2' }[] = [];
  for (const m of mapasCenpes) {
    const mapa = await db.mapa.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, name: m.name, imagePath: m.imagePath },
      update: { name: m.name, imagePath: m.imagePath },
    });
    mapas.push({ ...mapa, cenpes: m.cenpes });
  }

  // Seed 8 setores por mapa
  const setores: { id: number; name: string }[] = [];
  for (const mapa of mapas) {
    for (let i = 1; i <= 8; i++) {
      const setor = await db.setor.upsert({
        where: { idMapa_name: { idMapa: mapa.id, name: `Setor ${i}` } },
        create: { idMapa: mapa.id, name: `Setor ${i}`, cenpes: mapa.cenpes },
        update: {},
      });
      setores.push(setor);
    }
  }

  // Setor lookup: mapa slug + number → setor id
  const getSetor = (mapaSlug: string, n: number) => {
    const mapa = mapas.find(m => m.slug === mapaSlug)!;
    return setores.find(s => {
      // find via db query result — name is 'Setor N' and we need idMapa match
      return s.name === `Setor ${n}`;
    });
  };

  // Actually, let me build a proper lookup map
  const setorMap = new Map<string, number>(); // key: `${mapaSlug}:${n}`
  for (const mapa of mapas) {
    for (let i = 1; i <= 8; i++) {
      const found = setores.find(s => s.name === `Setor ${i}`);
      if (found) setorMap.set(`${mapa.slug}:${i}`, found.id);
    }
  }

  // Re-build with proper mapa association
  const setorIdMap = new Map<string, number>();
  for (const mapa of mapas) {
    for (let i = 1; i <= 8; i++) {
      const setor = await db.setor.findUnique({
        where: { idMapa_name: { idMapa: mapa.id, name: `Setor ${i}` } },
      });
      if (setor) setorIdMap.set(`${mapa.slug}:${i}`, setor.id);
    }
  }

  const labsData = [
    { name: 'Lab de Sensores', location: 'Bloco A, Sala 101', mapaSlug: 'cenpes-1', setorN: 1 },
    { name: 'Lab de Calibração', location: 'Bloco A, Sala 102', mapaSlug: 'cenpes-1', setorN: 1 },
    { name: 'Lab de CLP', location: 'Bloco B, Sala 201', mapaSlug: 'cenpes-1', setorN: 2 },
    { name: 'Lab de SCADA', location: 'Bloco B, Sala 202', mapaSlug: 'cenpes-1', setorN: 2 },
    { name: 'Lab de Análise Química', location: 'Bloco C, Sala 301', mapaSlug: 'cenpes-2', setorN: 1 },
    { name: 'Lab de Síntese', location: 'Bloco C, Sala 302', mapaSlug: 'cenpes-2', setorN: 1 },
    { name: 'Lab de Microbiologia', location: 'Bloco D, Sala 401', mapaSlug: 'cenpes-2', setorN: 2 },
    { name: 'Lab de Genética', location: 'Bloco D, Sala 402', mapaSlug: 'cenpes-2', setorN: 2 },
    { name: 'Lab de Usinagem', location: 'Bloco E, Sala 501', mapaSlug: 'cenpes-2', setorN: 3 },
    { name: 'Lab de Soldagem', location: 'Bloco E, Sala 502', mapaSlug: 'cenpes-2', setorN: 3 },
  ];

  const labs: { id: number; name: string }[] = [];
  for (const l of labsData) {
    const idSetor = setorIdMap.get(`${l.mapaSlug}:${l.setorN}`);
    const lab = await db.lab.upsert({
      where: { name: l.name },
      create: { name: l.name, location: l.location, ...(idSetor != null ? { idSetor } : {}) },
      update: {},
    });
    labs.push(lab);
  }

  const equipamentosData: Array<{ name: string; labName: string; criticidade: 'baixa' | 'normal' | 'alta'; localInstalacao?: string }> = [
    { name: 'Sensor de Pressão', labName: 'Lab de Sensores', criticidade: 'normal', localInstalacao: 'Bancada 1' },
    { name: 'Sensor de Temperatura', labName: 'Lab de Sensores', criticidade: 'baixa', localInstalacao: 'Bancada 2' },
    { name: 'Sensor de Vazão', labName: 'Lab de Sensores', criticidade: 'alta', localInstalacao: 'Bancada 3' },
    { name: 'Multímetro Digital', labName: 'Lab de Calibração', criticidade: 'baixa' },
    { name: 'Osciloscópio', labName: 'Lab de Calibração', criticidade: 'normal' },
    { name: 'Gerador de Sinal', labName: 'Lab de Calibração', criticidade: 'normal' },
    { name: 'CLP Siemens S7-300', labName: 'Lab de CLP', criticidade: 'alta', localInstalacao: 'Rack 1' },
    { name: 'CLP Allen Bradley', labName: 'Lab de CLP', criticidade: 'alta', localInstalacao: 'Rack 2' },
    { name: 'Módulo de I/O', labName: 'Lab de CLP', criticidade: 'normal', localInstalacao: 'Rack 1' },
    { name: 'Servidor SCADA', labName: 'Lab de SCADA', criticidade: 'alta', localInstalacao: 'Sala de Servidores' },
    { name: 'Estação de Engenharia', labName: 'Lab de SCADA', criticidade: 'normal' },
    { name: 'Switch Industrial', labName: 'Lab de SCADA', criticidade: 'alta' },
    { name: 'Cromatógrafo', labName: 'Lab de Análise Química', criticidade: 'alta', localInstalacao: 'Bancada Principal' },
    { name: 'Espectrofotômetro', labName: 'Lab de Análise Química', criticidade: 'alta', localInstalacao: 'Bancada 2' },
    { name: 'Balança Analítica', labName: 'Lab de Análise Química', criticidade: 'normal', localInstalacao: 'Bancada 3' },
    { name: 'pH-metro', labName: 'Lab de Análise Química', criticidade: 'baixa' },
    { name: 'Reator de Síntese', labName: 'Lab de Síntese', criticidade: 'alta', localInstalacao: 'Capela 1' },
    { name: 'Destilador', labName: 'Lab de Síntese', criticidade: 'normal', localInstalacao: 'Bancada 1' },
    { name: 'Agitador Magnético', labName: 'Lab de Síntese', criticidade: 'baixa' },
    { name: 'Estufa de Secagem', labName: 'Lab de Síntese', criticidade: 'normal', localInstalacao: 'Área de Secagem' },
    { name: 'Autoclave', labName: 'Lab de Microbiologia', criticidade: 'alta', localInstalacao: 'Sala de Esterilização' },
    { name: 'Câmara de Fluxo Laminar', labName: 'Lab de Microbiologia', criticidade: 'alta', localInstalacao: 'Sala Limpa' },
    { name: 'Incubadora', labName: 'Lab de Microbiologia', criticidade: 'normal' },
    { name: 'Centrífuga', labName: 'Lab de Microbiologia', criticidade: 'alta', localInstalacao: 'Bancada 1' },
    { name: 'Microscópio Óptico', labName: 'Lab de Microbiologia', criticidade: 'normal', localInstalacao: 'Bancada 2' },
    { name: 'Termociclador', labName: 'Lab de Genética', criticidade: 'alta', localInstalacao: 'Bancada Principal' },
    { name: 'Eletroforese', labName: 'Lab de Genética', criticidade: 'normal' },
    { name: 'Sequenciador de DNA', labName: 'Lab de Genética', criticidade: 'alta', localInstalacao: 'Sala de Sequenciamento' },
    { name: 'Câmara Fria', labName: 'Lab de Genética', criticidade: 'alta', localInstalacao: 'Corredor' },
    { name: 'Torno CNC', labName: 'Lab de Usinagem', criticidade: 'alta', localInstalacao: 'Área de Usinagem' },
    { name: 'Fresadora', labName: 'Lab de Usinagem', criticidade: 'alta', localInstalacao: 'Área de Usinagem' },
    { name: 'Retífica', labName: 'Lab de Usinagem', criticidade: 'normal', localInstalacao: 'Área de Usinagem' },
    { name: 'Compressor de Ar', labName: 'Lab de Usinagem', criticidade: 'normal', localInstalacao: 'Área Técnica' },
    { name: 'Soldadora MIG', labName: 'Lab de Soldagem', criticidade: 'normal', localInstalacao: 'Bancada 1' },
    { name: 'Soldadora TIG', labName: 'Lab de Soldagem', criticidade: 'normal', localInstalacao: 'Bancada 2' },
    { name: 'Máscara de Solda Automática', labName: 'Lab de Soldagem', criticidade: 'baixa' },
    { name: 'Esmerilhadeira', labName: 'Lab de Soldagem', criticidade: 'normal', localInstalacao: 'Área de Acabamento' },
    { name: 'Mesa Cirúrgica de Testes', labName: 'Lab de Soldagem', criticidade: 'baixa' },
    { name: 'Maçarico a Gás', labName: 'Lab de Soldagem', criticidade: 'alta', localInstalacao: 'Área de Soldagem a Gás' },
    { name: 'Medidor de Espessura', labName: 'Lab de Soldagem', criticidade: 'baixa' },
  ];

  for (const e of equipamentosData) {
    const lab = labs.find((l) => l.name === e.labName);
    if (!lab) continue;
    await db.equipamento.upsert({
      where: { name_idLab: { name: e.name, idLab: lab.id } },
      create: {
        name: e.name,
        idLab: lab.id,
        criticidade: e.criticidade,
        ...(e.localInstalacao != null ? { localInstalacao: e.localInstalacao } : {}),
        createdByUsername: 'planejador',
      },
      update: {},
    });
  }

  logger.info('Seed concluido com sucesso.');
}
