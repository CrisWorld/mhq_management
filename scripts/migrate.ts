import { readFile, readdir } from 'node:fs/promises';
import { database } from './db';
const db = database();
try {
  await db.connect();
  await db.query(
    'create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);',
  );
  await db.query(
    'create table if not exists public.mhq_schema_migrations (version text primary key, applied_at timestamptz not null default now()); revoke all on public.mhq_schema_migrations from anon, authenticated;',
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const version = file.split('_')[0],
      name = file.slice(version.length + 1, -4);
    if (
      (await db.query('select 1 from public.mhq_schema_migrations where version=$1', [file]))
        .rowCount
    ) {
      await db.query(
        'insert into supabase_migrations.schema_migrations(version,name) values ($1,$2) on conflict(version) do nothing',
        [version, name],
      );
      continue;
    }
    await db.query('begin');
    try {
      await db.query(await readFile('supabase/migrations/' + file, 'utf8'));
      await db.query('insert into public.mhq_schema_migrations(version) values ($1)', [file]);
      await db.query(
        'insert into supabase_migrations.schema_migrations(version,name) values ($1,$2) on conflict(version) do nothing',
        [version, name],
      );
      await db.query('commit');
      console.log('Applied:', file);
    } catch (e) {
      await db.query('rollback');
      throw e;
    }
  }
} finally {
  await db.end();
}
