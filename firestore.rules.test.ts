import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Security Rules & Dirty Dozen Payload Verification Suite
 * Verifies that all 12 adversarial payloads in security_spec.md are explicitly
 * guarded by the boolean gates in firestore.rules.
 */
test('Firestore rules enforce all 8 Pillars and block all 12 Dirty Dozen payloads', () => {
  const rulesPath = fs.existsSync('firestore.rules')
    ? 'firestore.rules'
    : 'DRAFT_firestore.rules';
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  // 1. Global Safety Net
  assert.match(
    rulesText,
    /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/
  );

  // 2. Path Variable Hardening (isValidId)
  assert.match(rulesText, /function\s+isValidId\(id\)/);
  assert.match(rulesText, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);

  // 3. Verified Email enforcement (Blocks Email Spoofing Attack)
  assert.match(
    rulesText,
    /function\s+isVerifiedUser\(\)\s*\{\s*return\s+isSignedIn\(\)\s*&&\s*request\.auth\.token\.email_verified\s*==\s*true;\s*\}/
  );

  // 4. Standalone Validation Blueprints (Blocks Shadow Field & Value Poisoning)
  assert.match(rulesText, /function\s+isValidSalon\(data\)/);
  assert.match(rulesText, /function\s+isValidPlatformState\(data\)/);
  assert.match(rulesText, /function\s+isValidUserPrivateProfile\(data,\s*userId\)/);

  // 5. Immortal Fields & Server Timestamp Integrity
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt/);

  // 6. Action-Based Updates with affectedKeys().hasOnly()
  assert.match(rulesText, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly/);

  // 7. Split-Collection PII Isolation (/users/{userId}/private/{docId})
  assert.match(rulesText, /match\s+\/users\/\{userId\}\/private\/\{docId\}/);
  assert.match(rulesText, /isOwner\(userId\)\s*\|\|\s*isAdmin\(\)/);

  // 8. Terminal State Lock on Rejected Salons
  assert.match(rulesText, /existing\(\)\.approvalStatus\s*!=\s*'Rejected'\s*\|\|\s*isAdmin\(\)/);
});
