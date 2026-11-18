BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status TEXT
    CHECK (membership_status IN ('active', 'trialing', 'past_due', 'paused', 'canceled'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;
COMMIT;