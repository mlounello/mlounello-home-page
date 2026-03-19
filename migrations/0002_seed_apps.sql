INSERT INTO apps (slug, name, host, environment, app_status, role_model, notes)
VALUES
  ('gobopad', 'GoboPad', 'gobopad.mlounello.com', 'production', 'live', 'Owner / Admin / Crew', 'Lighting workflow app with active production access.'),
  ('theatre-budget-app', 'Theatre Budget App', 'theatrebudgetapp.mlounello.com', 'production', 'live', 'Owner / Finance / Viewer', 'Budget access should stay tightly scoped by department.'),
  ('domeimages', 'DomeImages', 'sienadome.mlounello.com', 'production', 'live', 'Owner / Editor / Viewer', 'Media library with shared asset visibility rules.'),
  ('siena-wheel', 'Siena Wheel', 'sienawheel.mlounello.com', 'production', 'live', 'Owner / Instructor / Viewer', 'Broader classroom-facing access with simpler role tiers.'),
  ('alcohol-origins', 'Alcohol Origins', 'alcoholorigins.mlounello.com', 'pilot', 'pilot', 'Owner / Editor / Viewer', 'Editorial access should stay limited while content settles.'),
  ('showprep-app', 'ShowPrep App', 'showprepapp.mlounello.com', 'production', 'live', 'Owner / Stage Manager / Crew', 'Operational app where role boundaries affect day-of-show work.')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  host = excluded.host,
  environment = excluded.environment,
  app_status = excluded.app_status,
  role_model = excluded.role_model,
  notes = excluded.notes;
