ALTER TABLE users ADD COLUMN last_synced_at TEXT;
ALTER TABLE app_memberships ADD COLUMN synced_at TEXT;
