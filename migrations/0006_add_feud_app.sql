INSERT INTO apps (slug, name, host, environment, app_status, role_model, notes)
VALUES
  ('feud-app', 'Feud App', 'feudapp.mlounello.com', 'production', 'live', 'Owner / Host / Viewer', 'Live game app with event-facing access and lightweight moderation roles.')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  host = excluded.host,
  environment = excluded.environment,
  app_status = excluded.app_status,
  role_model = excluded.role_model,
  notes = excluded.notes;
