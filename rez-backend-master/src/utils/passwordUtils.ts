/**
 * passwordUtils.ts — Centralised password hashing helpers.
 *
 * All bcrypt operations across the backend MUST use these helpers so that
 * BCRYPT_ROUNDS is read from env in exactly one place.  Scattered hardcoded
 * genSalt(10) calls have been replaced to use this module.
 */
import bcrypt from 'bcryptjs';

/** Number of bcrypt salt rounds — reads BCRYPT_ROUNDS env var, defaults to 12. */
export const BCRYPT_ROUNDS = (): number => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  // Clamp to sane range to catch misconfigured env values
  if (isNaN(rounds) || rounds < 10 || rounds > 15) return 12;
  return rounds;
};

/** Hash a plaintext password using the configured salt rounds. */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS());
  return bcrypt.hash(plaintext, salt);
}

/** Compare a plaintext candidate against a stored hash. */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
