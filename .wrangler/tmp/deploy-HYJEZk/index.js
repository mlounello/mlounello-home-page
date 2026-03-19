var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var OWNER_QUEUE = [
  "Cloudflare Access should protect /admin/* and /api/admin/* to your Google identity only.",
  "Use this control room for shared account governance, not app-specific operational edits.",
  "Connect each app to the central sync API so user counts stay live.",
  "Normalize role names across apps so assignments stay predictable.",
  "Add audit logging before delegating admin work to anyone else."
];
var index_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/admin" || url.pathname === "/api/admin/" || url.pathname.startsWith("/api/admin/")) {
        return handleAdminApi(request, env);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json(
        {
          error: "Worker exception",
          detail: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
};
async function handleAdminApi(request, env) {
  if (!env.DB) {
    return json(
      {
        error: "D1 binding is not configured yet. Add your database_id to wrangler.jsonc and deploy again."
      },
      500
    );
  }
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/admin/sync/app-users") {
    return syncAppUsers(request, env);
  }
  const authError = ensureOwner(request, env);
  if (authError) {
    return authError;
  }
  if (request.method === "GET" && (url.pathname === "/api/admin" || url.pathname === "/api/admin/")) {
    return json({
      ok: true,
      message: "Admin API is live. Use /api/admin/bootstrap for dashboard data."
    });
  }
  if (request.method === "GET" && url.pathname === "/api/admin/bootstrap") {
    return handleBootstrap(env);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/users") {
    return upsertUser(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/memberships") {
    return upsertMembership(request, env);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/memberships/toggle") {
    return toggleMembership(request, env);
  }
  return json({ error: "Not found" }, 404);
}
__name(handleAdminApi, "handleAdminApi");
function ensureOwner(request, env) {
  const expectedOwner = env.OWNER_EMAIL;
  if (!expectedOwner) {
    return null;
  }
  const authenticatedEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!authenticatedEmail || authenticatedEmail.toLowerCase() !== expectedOwner.toLowerCase()) {
    console.log(
      JSON.stringify({
        event: "admin_owner_rejected",
        path: new URL(request.url).pathname,
        expectedOwner,
        authenticatedEmail: authenticatedEmail || null
      })
    );
    return json({ error: "Forbidden" }, 403);
  }
  return null;
}
__name(ensureOwner, "ensureOwner");
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
      COUNT(CASE WHEN m.membership_status != 'revoked' THEN m.id END) AS user_count,
      MAX(m.synced_at) AS last_synced_at
    FROM apps a
    LEFT JOIN app_memberships m
      ON m.app_id = a.id
    GROUP BY a.id
    ORDER BY a.name ASC`
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
    ORDER BY u.full_name ASC`
  ).all();
  const hostedApps = appRows.results.length;
  const liveApps = appRows.results.filter((app) => app.app_status === "live").length;
  const assignedSeats = appRows.results.reduce((sum, app) => sum + Number(app.user_count || 0), 0);
  const pendingUsers = userRows.results.filter((user) => user.account_status === "pending_review").length;
  return json({
    securityMessage: env.OWNER_EMAIL ? `Owner lock is active for ${env.OWNER_EMAIL}.` : "OWNER_EMAIL is not set yet. Cloudflare Access should be added before production use.",
    metrics: {
      hostedApps,
      liveApps,
      assignedSeats,
      pendingUsers
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
      lastSyncedAt: app.last_synced_at
    })),
    users: userRows.results.map((user) => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      roleLabel: labelize(user.global_role),
      statusLabel: labelize(user.account_status),
      roleValue: user.global_role,
      statusValue: user.account_status,
      notes: user.notes,
      appSummary: user.app_summary
    })),
    memberships: await loadMemberships(env),
    ownerQueue: OWNER_QUEUE
  });
}
__name(handleBootstrap, "handleBootstrap");
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
       notes = excluded.notes`
  ).bind(
    body.fullName.trim(),
    body.email.trim().toLowerCase(),
    normalizeToken(body.globalRole, "member"),
    normalizeToken(body.accountStatus, "active"),
    safeText(body.notes)
  ).run();
  return json({ ok: true });
}
__name(upsertUser, "upsertUser");
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
       membership_status = excluded.membership_status`
  ).bind(
    Number(body.userId),
    Number(body.appId),
    safeText(body.appRole),
    normalizeToken(body.permissionLevel, "managed"),
    normalizeToken(body.membershipStatus, "active")
  ).run();
  return json({ ok: true });
}
__name(upsertMembership, "upsertMembership");
async function toggleMembership(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.userId || !body?.appId) {
    return json({ error: "User and app are required." }, 400);
  }
  const existing = await env.DB.prepare(
    `SELECT id, membership_status
     FROM app_memberships
     WHERE user_id = ? AND app_id = ?`
  ).bind(Number(body.userId), Number(body.appId)).first();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO app_memberships (user_id, app_id, app_role, permission_level, membership_status, synced_at)
       VALUES (?, ?, 'viewer', 'read', 'active', CURRENT_TIMESTAMP)`
    ).bind(Number(body.userId), Number(body.appId)).run();
    return json({ ok: true, active: true });
  }
  const nextStatus = existing.membership_status === "revoked" ? "active" : "revoked";
  await env.DB.prepare(
    `UPDATE app_memberships
     SET membership_status = ?, synced_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND app_id = ?`
  ).bind(nextStatus, Number(body.userId), Number(body.appId)).run();
  return json({ ok: true, active: nextStatus !== "revoked" });
}
__name(toggleMembership, "toggleMembership");
async function loadMemberships(env) {
  const rows = await env.DB.prepare(
    `SELECT
      m.id,
      m.user_id,
      m.app_id,
      m.app_role,
      m.permission_level,
      m.membership_status,
      m.synced_at
    FROM app_memberships m`
  ).all();
  return rows.results.map((membership) => ({
    id: membership.id,
    userId: membership.user_id,
    appId: membership.app_id,
    appRole: membership.app_role,
    permissionLevel: membership.permission_level,
    membershipStatus: membership.membership_status,
    syncedAt: membership.synced_at
  }));
}
__name(loadMemberships, "loadMemberships");
async function syncAppUsers(request, env) {
  const authError = ensureSyncSecret(request, env);
  if (authError) {
    return authError;
  }
  const body = await request.json().catch(() => null);
  if (!body?.appSlug || !Array.isArray(body.users)) {
    console.log(
      JSON.stringify({
        event: "app_sync_invalid_payload",
        reason: "missing_app_slug_or_users",
        hasAppSlug: Boolean(body?.appSlug),
        usersIsArray: Array.isArray(body?.users)
      })
    );
    return json({ error: "appSlug and users[] are required." }, 400);
  }
  const app = await env.DB.prepare(`SELECT id, name FROM apps WHERE slug = ?`).bind(body.appSlug).first();
  if (!app) {
    console.log(
      JSON.stringify({
        event: "app_sync_unknown_slug",
        appSlug: body.appSlug
      })
    );
    return json({ error: "Unknown app slug." }, 404);
  }
  const seenEmails = /* @__PURE__ */ new Set();
  let syncedUsers = 0;
  for (const user of body.users) {
    if (!user?.email || !user?.fullName) {
      console.log(
        JSON.stringify({
          event: "app_sync_skipped_user",
          appSlug: body.appSlug,
          reason: "missing_email_or_full_name",
          hasEmail: Boolean(user?.email),
          hasFullName: Boolean(user?.fullName)
        })
      );
      continue;
    }
    const email = user.email.trim().toLowerCase();
    seenEmails.add(email);
    await env.DB.prepare(
      `INSERT INTO users (full_name, email, global_role, account_status, notes, last_synced_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET
         full_name = excluded.full_name,
         global_role = excluded.global_role,
         account_status = excluded.account_status,
         notes = excluded.notes,
         last_synced_at = CURRENT_TIMESTAMP`
    ).bind(
      user.fullName.trim(),
      email,
      normalizeToken(user.globalRole, "member"),
      normalizeToken(user.accountStatus, "active"),
      safeText(user.notes)
    ).run();
    const syncedUser = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
    await env.DB.prepare(
      `INSERT INTO app_memberships (user_id, app_id, app_role, permission_level, membership_status, synced_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, app_id) DO UPDATE SET
         app_role = excluded.app_role,
         permission_level = excluded.permission_level,
         membership_status = excluded.membership_status,
         synced_at = CURRENT_TIMESTAMP`
    ).bind(
      syncedUser.id,
      app.id,
      safeText(user.appRole || "viewer"),
      normalizeToken(user.permissionLevel, "read"),
      normalizeToken(user.membershipStatus, "active")
    ).run();
    syncedUsers += 1;
  }
  if (body.fullSync) {
    if (seenEmails.size === 0) {
      await env.DB.prepare(
        `UPDATE app_memberships
         SET membership_status = 'revoked', synced_at = CURRENT_TIMESTAMP
         WHERE app_id = ?`
      ).bind(app.id).run();
    } else {
      const placeholders = [...seenEmails].map(() => "?").join(", ");
      const bindings = [app.id, ...seenEmails];
      await env.DB.prepare(
        `UPDATE app_memberships
         SET membership_status = 'revoked', synced_at = CURRENT_TIMESTAMP
         WHERE app_id = ?
           AND user_id IN (
             SELECT id FROM users WHERE email NOT IN (${placeholders})
           )`
      ).bind(...bindings).run();
    }
  }
  return json({
    ok: true,
    app: app.name,
    syncedUsers
  });
}
__name(syncAppUsers, "syncAppUsers");
function ensureSyncSecret(request, env) {
  if (!env.APP_SYNC_SECRET) {
    console.log(
      JSON.stringify({
        event: "app_sync_secret_missing"
      })
    );
    return json({ error: "APP_SYNC_SECRET is not configured." }, 500);
  }
  const token = request.headers.get("X-App-Sync-Secret");
  if (!token || token !== env.APP_SYNC_SECRET) {
    console.log(
      JSON.stringify({
        event: "app_sync_secret_rejected",
        hasHeader: Boolean(token),
        receivedLength: token ? token.length : 0,
        expectedLength: env.APP_SYNC_SECRET.length
      })
    );
    return json({ error: "Unauthorized sync request." }, 401);
  }
  return null;
}
__name(ensureSyncSecret, "ensureSyncSecret");
function normalizeToken(value, fallback) {
  if (!value || typeof value !== "string") {
    return fallback;
  }
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}
__name(normalizeToken, "normalizeToken");
function safeText(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim();
}
__name(safeText, "safeText");
function labelize(value) {
  if (!value) {
    return "Not set";
  }
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
__name(labelize, "labelize");
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(json, "json");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
