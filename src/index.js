const OWNER_QUEUE = [
  "Cloudflare Access should protect /admin/* and /api/admin/* to your Google identity only.",
  "Use this control room for shared account governance, not app-specific operational edits.",
  "Normalize role names across apps so assignments stay predictable.",
  "Add audit logging before delegating admin work to anyone else.",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/admin/")) {
      return handleAdminApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAdminApi(request, env) {
  if (!env.DB) {
    return json(
      {
        error: "D1 binding is not configured yet. Add your database_id to wrangler.jsonc and deploy again.",
      },
      500,
    );
  }

  const authError = ensureOwner(request, env);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/admin/bootstrap") {
    return handleBootstrap(env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/users") {
    return upsertUser(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/memberships") {
    return upsertMembership(request, env);
  }

  return json({ error: "Not found" }, 404);
}

function ensureOwner(request, env) {
  const expectedOwner = env.OWNER_EMAIL;

  if (!expectedOwner) {
    return null;
  }

  const authenticatedEmail = request.headers.get("Cf-Access-Authenticated-User-Email");

  if (!authenticatedEmail || authenticatedEmail.toLowerCase() !== expectedOwner.toLowerCase()) {
    return json({ error: "Forbidden" }, 403);
  }

  return null;
}

async function handleBootstrap(env) {
  const appRows = await env.DB.prepare(
    `SELECT
      a.id,
      a.slug,
      a.name,
      a.host,
      a.environment,
      a.app_status,
      a.role_model,
      a.notes,
      COUNT(m.id) AS user_count
    FROM apps a
    LEFT JOIN app_memberships m
      ON m.app_id = a.id
      AND m.membership_status != 'revoked'
    GROUP BY a.id
    ORDER BY a.name ASC`,
  ).all();

  const userRows = await env.DB.prepare(
    `SELECT
      u.id,
      u.full_name,
      u.email,
      u.global_role,
      u.account_status,
      u.notes,
      COALESCE(
        GROUP_CONCAT(a.name || ' (' || m.app_role || ')', ', '),
        ''
      ) AS app_summary
    FROM users u
    LEFT JOIN app_memberships m
      ON m.user_id = u.id
      AND m.membership_status != 'revoked'
    LEFT JOIN apps a
      ON a.id = m.app_id
    GROUP BY u.id
    ORDER BY u.full_name ASC`,
  ).all();

  const hostedApps = appRows.results.length;
  const liveApps = appRows.results.filter((app) => app.app_status === "live").length;
  const assignedSeats = appRows.results.reduce((sum, app) => sum + Number(app.user_count || 0), 0);
  const pendingUsers = userRows.results.filter((user) => user.account_status === "pending_review").length;

  return json({
    securityMessage: env.OWNER_EMAIL
      ? `Owner lock is active for ${env.OWNER_EMAIL}.`
      : "OWNER_EMAIL is not set yet. Cloudflare Access should be added before production use.",
    metrics: {
      hostedApps,
      liveApps,
      assignedSeats,
      pendingUsers,
    },
    apps: appRows.results.map((app) => ({
      id: app.id,
      slug: app.slug,
      name: app.name,
      host: app.host,
      environmentLabel: labelize(app.environment),
      statusLabel: labelize(app.app_status),
      roleModel: app.role_model,
      note: app.notes,
      userCount: Number(app.user_count || 0),
    })),
    users: userRows.results.map((user) => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      roleLabel: labelize(user.global_role),
      statusLabel: labelize(user.account_status),
      notes: user.notes,
      appSummary: user.app_summary,
    })),
    ownerQueue: OWNER_QUEUE,
  });
}

async function upsertUser(request, env) {
  const body = await request.json().catch(() => null);

  if (!body?.fullName || !body?.email) {
    return json({ error: "Full name and email are required." }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO users (full_name, email, global_role, account_status, notes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       full_name = excluded.full_name,
       global_role = excluded.global_role,
       account_status = excluded.account_status,
       notes = excluded.notes`,
  )
    .bind(
      body.fullName.trim(),
      body.email.trim().toLowerCase(),
      normalizeToken(body.globalRole, "member"),
      normalizeToken(body.accountStatus, "active"),
      safeText(body.notes),
    )
    .run();

  return json({ ok: true });
}

async function upsertMembership(request, env) {
  const body = await request.json().catch(() => null);

  if (!body?.userId || !body?.appId || !body?.appRole) {
    return json({ error: "User, app, and app role are required." }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO app_memberships (user_id, app_id, app_role, permission_level, membership_status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, app_id) DO UPDATE SET
       app_role = excluded.app_role,
       permission_level = excluded.permission_level,
       membership_status = excluded.membership_status`,
  )
    .bind(
      Number(body.userId),
      Number(body.appId),
      safeText(body.appRole),
      normalizeToken(body.permissionLevel, "managed"),
      normalizeToken(body.membershipStatus, "active"),
    )
    .run();

  return json({ ok: true });
}

function normalizeToken(value, fallback) {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function safeText(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function labelize(value) {
  if (!value) {
    return "Not set";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
