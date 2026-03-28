import { getDB } from '../db/schema';

export interface CredentialRow {
  id: number;
  site_name: string;
  site_url: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
  breach_status: 'safe' | 'compromised' | 'unknown';
  pwned_count: number;
  last_scanned: string | null;
  created_at: string;
  updated_at: string;
}

export function getAll(): CredentialRow[] {
  const db = getDB();
  return db.prepare('SELECT * FROM credentials ORDER BY created_at DESC').all() as CredentialRow[];
}

export function getById(id: number): CredentialRow | undefined {
  const db = getDB();
  return db.prepare('SELECT * FROM credentials WHERE id = ?').get(id) as CredentialRow | undefined;
}

export function create(data: {
  site_name: string;
  site_url: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
}): CredentialRow {
  const db = getDB();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO credentials (site_name, site_url, username, encrypted_password, iv, auth_tag, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.site_name,
    data.site_url,
    data.username,
    data.encrypted_password,
    data.iv,
    data.auth_tag,
    now,
    now
  );
  return getById(result.lastInsertRowid as number)!;
}

export function update(
  id: number,
  data: Partial<{
    site_name: string;
    site_url: string;
    username: string;
    encrypted_password: string;
    iv: string;
    auth_tag: string;
  }>
): CredentialRow | undefined {
  const db = getDB();
  const existing = getById(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE credentials SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getById(id);
}

export function deleteById(id: number): boolean {
  const db = getDB();
  const result = db.prepare('DELETE FROM credentials WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateBreachStatus(
  id: number,
  status: 'safe' | 'compromised' | 'unknown'
): void {
  const db = getDB();
  db.prepare(
    'UPDATE credentials SET breach_status = ?, last_scanned = ?, updated_at = ? WHERE id = ?'
  ).run(status, new Date().toISOString(), new Date().toISOString(), id);
}

export function updatePwnedCount(id: number, count: number): void {
  const db = getDB();
  const status = count > 0 ? 'compromised' : 'safe';
  db.prepare(
    'UPDATE credentials SET pwned_count = ?, breach_status = ?, last_scanned = ?, updated_at = ? WHERE id = ?'
  ).run(count, status, new Date().toISOString(), new Date().toISOString(), id);
}
