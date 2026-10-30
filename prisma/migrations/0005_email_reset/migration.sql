-- Password resets now go by emailed code (Better Auth's email-OTP plugin, stored in "verification").
-- No account ever saved a recovery code, so the table goes with nothing in it.
DROP TABLE IF EXISTS "recovery_code";
