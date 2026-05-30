-- Migration 008: Hash existing plain-text PINs using bcrypt (pgcrypto)
-- Run this ONCE against the live DB. After this, the app code uses bcryptjs.compare().
-- pgcrypto's crypt() with 'bf' (Blowfish/bcrypt) produces hashes compatible with bcryptjs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash the four demo users by email (safe to re-run: crypt detects already-hashed values)
UPDATE users SET pin = crypt('1234', gen_salt('bf', 10)) WHERE email = 'admin@gianfranco.com'    AND length(pin) < 20;
UPDATE users SET pin = crypt('2222', gen_salt('bf', 10)) WHERE email = 'bar@gianfranco.com'      AND length(pin) < 20;
UPDATE users SET pin = crypt('3333', gen_salt('bf', 10)) WHERE email = 'kitchen@gianfranco.com'  AND length(pin) < 20;
UPDATE users SET pin = crypt('4444', gen_salt('bf', 10)) WHERE email = 'salon@gianfranco.com'    AND length(pin) < 20;

-- If there are other users with plain-text PINs (length < 20), hash them all.
-- WARNING: this assumes plain PINs are short (<20 chars). bcrypt hashes are always 60 chars.
UPDATE users SET pin = crypt(pin, gen_salt('bf', 10)) WHERE length(pin) < 20;
