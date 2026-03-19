const state = {
  apps: [],
  users: [],
  ownerQueue: [],
};

const metricContainer = document.getElementById("adminMetrics");
const directoryContainer = document.getElementById("userDirectory");
const appContainer = document.getElementById("adminApps");
const matrixContainer = document.getElementById("permissionMatrix");
const queueContainer = document.getElementById("ownerQueue");
const flashContainer = document.getElementById("adminFlash");
const userForm = document.getElementById("userForm");
const assignmentForm = document.getElementById("assignmentForm");
const assignmentUser = document.getElementById("assignmentUser");
const assignmentApp = document.getElementById("assignmentApp");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

function showFlash(message, tone = "info") {
  if (!flashContainer) {
    return;
  }

  flashContainer.className = `admin-flash is-${tone}`;
  flashContainer.textContent = message;
}

function createMetric(label, value, helper) {
  return `
    <div class="metric-card">
      <p class="metric-label">${label}</p>
      <p class="metric-value">${value}</p>
      <p class="metric-helper">${helper}</p>
    </div>
  `;
}

function renderMetrics(metrics) {
  if (!metricContainer) {
    return;
  }

  metricContainer.innerHTML = [
    createMetric("Hosted apps", metrics.hostedApps, "Connected to the shared layer"),
    createMetric("Live apps", metrics.liveApps, "Production-ready and assigned"),
    createMetric("Assigned seats", metrics.assignedSeats, "Across all hosted apps"),
    createMetric("Pending review", metrics.pendingUsers, "Accounts needing owner attention"),
  ].join("");
}

function renderUsers(users) {
  if (!directoryContainer) {
    return;
  }

  directoryContainer.innerHTML = users
    .map(
      (user) => `
        <article class="directory-card">
          <div class="directory-head">
            <div>
              <h3>${user.name}</h3>
              <p class="directory-email">${user.email}</p>
            </div>
            <span class="directory-status">${user.statusLabel}</span>
          </div>
          <div class="directory-meta">
            <p><span>Global role</span>${user.roleLabel}</p>
            <p><span>Apps</span>${user.appSummary || "No apps assigned"}</p>
            <p><span>Notes</span>${user.notes || "No notes"}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderApps(apps) {
  if (!appContainer) {
    return;
  }

  appContainer.innerHTML = apps
    .map(
      (app) => `
        <article class="hosted-app-card">
          <div class="hosted-app-head">
            <h3>${app.name}</h3>
            <span class="status-chip">${app.statusLabel}</span>
          </div>
          <p class="hosted-app-note">${app.note || "No app note set yet."}</p>
          <div class="hosted-app-meta">
            <p><span>Environment</span>${app.environmentLabel}</p>
            <p><span>Users</span>${app.userCount}</p>
            <p><span>Role model</span>${app.roleModel || "Not set"}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderMatrix(apps) {
  if (!matrixContainer) {
    return;
  }

  matrixContainer.innerHTML = `
    <div class="matrix-row matrix-head">
      <span>App</span>
      <span>Owner</span>
      <span>Admin</span>
      <span>Ops / Editor</span>
      <span>Viewer</span>
    </div>
    ${apps
      .map(
        (app) => `
          <div class="matrix-row">
            <span class="matrix-app">${app.name}</span>
            <span class="matrix-pill is-strong">Full</span>
            <span class="matrix-pill">Managed</span>
            <span class="matrix-pill">Scoped</span>
            <span class="matrix-pill is-muted">Read</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderQueue(queue) {
  if (!queueContainer) {
    return;
  }

  queueContainer.innerHTML = queue
    .map(
      (item, index) => `
        <div class="queue-item">
          <span class="queue-index">0${index + 1}</span>
          <p>${item}</p>
        </div>
      `,
    )
    .join("");
}

function renderAssignmentOptions() {
  if (assignmentUser) {
    assignmentUser.innerHTML = state.users
      .map((user) => `<option value="${user.id}">${user.name} (${user.email})</option>`)
      .join("");
  }

  if (assignmentApp) {
    assignmentApp.innerHTML = state.apps
      .map((app) => `<option value="${app.id}">${app.name}</option>`)
      .join("");
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

async function loadAdmin() {
  try {
    const payload = await request("/api/admin/bootstrap");

    state.apps = payload.apps;
    state.users = payload.users;
    state.ownerQueue = payload.ownerQueue;

    renderMetrics(payload.metrics);
    renderUsers(payload.users);
    renderApps(payload.apps);
    renderMatrix(payload.apps);
    renderQueue(payload.ownerQueue);
    renderAssignmentOptions();

    showFlash(payload.securityMessage || "Admin data loaded.", "success");
  } catch (error) {
    showFlash(error.message, "error");
  }
}

if (userForm) {
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(userForm);

    try {
      await request("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          globalRole: formData.get("globalRole"),
          accountStatus: formData.get("accountStatus"),
          notes: formData.get("notes"),
        }),
      });

      userForm.reset();
      showFlash("User saved.", "success");
      await loadAdmin();
    } catch (error) {
      showFlash(error.message, "error");
    }
  });
}

if (assignmentForm) {
  assignmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(assignmentForm);

    try {
      await request("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({
          userId: Number(formData.get("userId")),
          appId: Number(formData.get("appId")),
          appRole: formData.get("appRole"),
          permissionLevel: formData.get("permissionLevel"),
          membershipStatus: formData.get("membershipStatus"),
        }),
      });

      assignmentForm.reset();
      showFlash("Assignment saved.", "success");
      await loadAdmin();
    } catch (error) {
      showFlash(error.message, "error");
    }
  });
}

loadAdmin();
