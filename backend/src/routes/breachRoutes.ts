import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { 
  scanPassword, 
  scanAllPasswords, 
  recordEmailBreaches, 
  getBreachStatus,
  scanWithMasterPassword
} from '../controllers/breachController';

const router = Router();

router.use(authMiddleware as any);

// ============ FREE PASSWORD BREACH SCANNING (No API Key Required) ============

/**
 * POST /api/breach/scan-password
 * 
 * Scan a single credential's password against Pwned Passwords API (free)
 * Body: { credentialId, masterPassword }
 */
router.post('/scan-password', scanPassword);

/**
 * POST /api/breach/scan-passwords
 * 
 * Scan all credentials' passwords against Pwned Passwords API (free)
 * Body: { masterPassword }
 */
router.post('/scan-passwords', scanAllPasswords);

/**
 * POST /api/breach/scan
 * 
 * Backward-compatible endpoint for breach scanning
 * Requires masterPassword to decrypt credentials for checking
 * Body: { credentialId?, masterPassword }
 */
router.post('/scan', scanWithMasterPassword);

// ============ MANUAL EMAIL BREACH LOOKUP (No API Key Required) ============

/**
 * POST /api/breach/record-email
 * 
 * Manually record email breaches (user copies from haveibeenpwned.com)
 * Body: { email, breaches: ['Adobe', 'LinkedIn', ...] }
 */
router.post('/record-email', recordEmailBreaches);

// ============ STATUS ENDPOINTS ============

/**
 * GET /api/breach/status
 * 
 * Get breach status for all credentials
 */
router.get('/status', getBreachStatus);

export default router;
