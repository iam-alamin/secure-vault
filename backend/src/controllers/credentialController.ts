import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as vault from '../services/vault';
import { encrypt, decrypt } from '../services/crypto';

export function getAll(req: AuthRequest, res: Response): void {
  const credentials = vault.getAll();

  // Return credentials WITHOUT decrypted passwords
  const safe = credentials.map(({ encrypted_password, iv, auth_tag, ...rest }) => rest);
  res.json(safe);
}

export function create(req: AuthRequest, res: Response): void {
  const { site_name, site_url, username, password } = req.body;

  if (!site_name || !username || !password) {
    res.status(400).json({ error: 'site_name, username, and password are required' });
    return;
  }

  const masterPassword = req.user!.masterPassword as string;
  const { ciphertext, iv, authTag } = encrypt(password, masterPassword);

  const credential = vault.create({
    site_name,
    site_url: site_url || '',
    username,
    encrypted_password: ciphertext,
    iv,
    auth_tag: authTag,
  });

  const { encrypted_password, iv: _, auth_tag: __, ...safe } = credential;
  res.status(201).json(safe);
}

export function update(req: AuthRequest, res: Response): void {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  const { site_name, site_url, username, password } = req.body;

  const existing = vault.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'Credential not found' });
    return;
  }

  const updateData: any = {};
  if (site_name !== undefined) updateData.site_name = site_name;
  if (site_url !== undefined) updateData.site_url = site_url;
  if (username !== undefined) updateData.username = username;

  if (password) {
    const masterPassword = req.user!.masterPassword as string;
    const { ciphertext, iv, authTag } = encrypt(password, masterPassword);
    updateData.encrypted_password = ciphertext;
    updateData.iv = iv;
    updateData.auth_tag = authTag;
  }

  const updated = vault.update(id, updateData);
  if (!updated) {
    res.status(500).json({ error: 'Failed to update credential' });
    return;
  }

  const { encrypted_password, iv: _, auth_tag: __, ...safe } = updated;
  res.json(safe);
}

export function remove(req: AuthRequest, res: Response): void {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  const deleted = vault.deleteById(id);

  if (!deleted) {
    res.status(404).json({ error: 'Credential not found' });
    return;
  }

  res.json({ success: true });
}

export function reveal(req: AuthRequest, res: Response): void {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  const credential = vault.getById(id);

  if (!credential) {
    res.status(404).json({ error: 'Credential not found' });
    return;
  }

  try {
    const masterPassword = req.user!.masterPassword as string;
    const password = decrypt(
      credential.encrypted_password,
      credential.iv,
      credential.auth_tag,
      masterPassword
    );
    res.json({ password });
  } catch {
    res.status(500).json({ error: 'Failed to decrypt — master password may have changed' });
  }
}
