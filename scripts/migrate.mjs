// NEXLOGISTIC – Migrationen aus supabase/migrations in Supabase einspielen.
//
// Warum nicht `supabase db push`? NEXLOGISTIC teilt sich das Supabase-Projekt mit NEXCOUNT.
// Die Supabase-CLI führt EINE Migrationsliste pro Datenbank und würde die NEXCOUNT-Migrationen
// als „fehlend“ melden. Deshalb führt NEXLOGISTIC ein eigenes Protokoll
// (Schema nexlogistic_meta) und spielt neue Dateien über die Management-API ein.
//
// Benötigt: SUPABASE_ACCESS_TOKEN (Supabase → Account → Access Tokens)
// Optional: SUPABASE_PROJECT_ID (Standard: Projekt aus public/config.js)
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_ID || 'xrzovtfaqthaxucaoale';
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN fehlt.');
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

await query(`
  create schema if not exists nexlogistic_meta;
  revoke all on schema nexlogistic_meta from public, anon, authenticated;
  create table if not exists nexlogistic_meta.migrations (
    version    text primary key,
    name       text not null,
    applied_at timestamptz not null default now()
  );`);

const done = new Set((await query('select version from nexlogistic_meta.migrations')).map((r) => r.version));
const dir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = (await readdir(dir)).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();

let applied = 0;
for (const file of files) {
  const version = file.slice(0, 14);
  if (done.has(version)) continue;
  const sql = await readFile(join(dir, file), 'utf8');
  process.stdout.write(`→ ${file} … `);
  // Migration und Protokolleintrag in einer Transaktion
  await query(`begin;\n${sql}\n;insert into nexlogistic_meta.migrations (version, name) values (${lit(version)}, ${lit(file)});\ncommit;`);
  console.log('ok');
  applied++;
}
console.log(applied ? `${applied} Migration(en) eingespielt.` : 'Datenbank ist aktuell.');
