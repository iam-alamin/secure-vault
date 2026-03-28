import cron from 'node-cron';
import { config } from '../config';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scheduled breach scanner.
 * 
 * NOTE: This scheduler is currently disabled because:
 * - Email scanning requires an API key (paid)
 * - Password scanning requires the master password (not stored)
 * 
 * Users can manually trigger password scans from the UI instead.
 */
export function startScheduler(): void {
  // Scheduler is disabled - manual scans only
  // The user must provide their master password to decrypt credentials
  // for password scanning, or have an API key for email scanning.
  
  console.log('[Scheduler] Automatic breach scanning disabled');
  console.log('[Scheduler] Use the UI to manually scan passwords or record email breaches');
}
