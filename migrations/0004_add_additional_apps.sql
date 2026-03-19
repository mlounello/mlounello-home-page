INSERT INTO apps (slug, name, host, environment, app_status, role_model, notes)
VALUES
  ('siena-map-app', 'Siena Map App', 'sienamapapp.mlounello.com', 'production', 'live', 'Owner / Editor / Viewer', 'Campus and location data should stay centrally governed.'),
  ('lighting-color-app', 'Lighting Color App', 'lightingcolorapp.mlounello.com', 'production', 'live', 'Owner / Designer / Viewer', 'Color workflow app with scoped creative access.'),
  ('playbill-app', 'Playbill App', 'playbillapp.mlounello.com', 'production', 'live', 'Owner / Editor / Viewer', 'Program and publishing workflow with editorial review roles.')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  host = excluded.host,
  environment = excluded.environment,
  app_status = excluded.app_status,
  role_model = excluded.role_model,
  notes = excluded.notes;
