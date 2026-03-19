const state = {
  apps: [],
  users: [],
  memberships: [],
  ownerQueue: [],
  selectedMembership: null,
};

const metricContainer = document.getElementById("adminMetrics");
const directoryContainer = document.getElementById("userDirectory");
const appContainer = document.getElementById("adminApps");
const matrixContainer = document.getElementById("permissionMatrix");
const queueContainer = document.getElementById("ownerQueue");
const flashContainer = document.getElementById("adminFlash");
const switchboardContainer = document.getElementById("switchboard");
const userForm = document.getElementById("userForm");
const assignmentForm = document.getElementById("assignmentForm");
const assignmentUser = document.getElementById("assignmentUser");
const assignmentApp = document.getElementById("assignmentApp");
const appRoleInput = document.getElementById("appRole");
const permissionLevelInput = document.getElementById("permissionLevel");
const membershipStatusInput = document.getElementById("membershipStatus");
const selectedMembershipSummary = document.getElementById("selectedMembershipSummary");
const removeAssignmentButton = document.getElementById("removeAssignmentButton");
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

function getMembership(userId, appId) {
  return state.memberships.find((membership) => membership.userId === userId && membership.appId === appId) || null;
}

function isActiveMembership(membership) {
  return membership && membership.membershipStatus !== "revoked";
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
            <p><span>Last sync</span>${app.lastSyncedAt ? new Date(app.lastSyncedAt).toLocaleString() : "No sync yet"}</p>
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

function renderSelectionSummary() {
  if (!selectedMembershipSummary) {
    return;
  }

  if (!state.selectedMembership) {
    selectedMembershipSummary.textContent =
      "Select a patch point in the switchboard below to edit that app assignment.";
    return;
  }

  const user = state.users.find((entry) => entry.id === state.selectedMembership.userId);
  const app = state.apps.find((entry) => entry.id === state.selectedMembership.appId);

  selectedMembershipSummary.textContent = `${user?.name || "Unknown user"} -> ${app?.name || "Unknown app"} | ${state.selectedMembership.appRole} | ${formatLabel(state.selectedMembership.permissionLevel)}`;
}

function populateRoleEditor() {
  renderAssignmentOptions();
  renderSelectionSummary();

  if (!state.selectedMembership) {
    assignmentForm?.reset();
    return;
  }

  assignmentUser.value = String(state.selectedMembership.userId);
  assignmentApp.value = String(state.selectedMembership.appId);
  appRoleInput.value = state.selectedMembership.appRole;
  permissionLevelInput.value = state.selectedMembership.permissionLevel;
  membershipStatusInput.value = state.selectedMembership.membershipStatus;
}

function renderSwitchboard() {
  if (!switchboardContainer) {
    return;
  }

  const headerCells = state.apps
    .map(
      (app) => `
        <div class="switchboard-app">
          <span>${app.name}</span>
        </div>
      `,
    )
    .join("");

  const rows = state.users
    .map((user) => {
      const cells = state.apps
        .map((app) => {
          const membership = getMembership(user.id, app.id);
          const isActive = isActiveMembership(membership);
          const isSelected =
            state.selectedMembership &&
            state.selectedMembership.userId === user.id &&
            state.selectedMembership.appId === app.id;

          return `
            <button
              class="patch-point${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}"
              type="button"
              data-user-id="${user.id}"
              data-app-id="${app.id}"
              aria-label="${isActive ? "Edit" : "Add"} ${user.name} on ${app.name}"
            >
              <span class="patch-core"></span>
            </button>
          `;
        })
        .join("");

      return `
        <div class="switchboard-user">
          <div class="switchboard-user-name">
            <strong>${user.name}</strong>
            <span>${user.email}</span>
          </div>
          <div class="switchboard-row">${cells}</div>
        </div>
      `;
    })
    .join("");

  switchboardContainer.innerHTML = `
    <div class="switchboard-head">
      <div class="switchboard-corner">Users / Apps</div>
      <div class="switchboard-apps">${headerCells}</div>
    </div>
    <div class="switchboard-body">${rows}</div>
  `;

  switchboardContainer.querySelectorAll(".patch-point").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.dataset.userId);
      const appId = Number(button.dataset.appId);
      const membership = getMembership(userId, appId);

      if (!membership) {
        try {
          await request("/api/admin/memberships/toggle", {
            method: "POST",
            body: JSON.stringify({ userId, appId }),
          });

          await loadAdmin({
            userId,
            appId,
          });
          showFlash("App access added.", "success");
        } catch (error) {
          showFlash(error.message, "error");
        }
        return;
      }

      state.selectedMembership = { ...membership };
      populateRoleEditor();
      renderSwitchboard();
    });
  });
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function syncSelectedMembership() {
  if (!state.selectedMembership) {
    return;
  }

  const next = getMembership(state.selectedMembership.userId, state.selectedMembership.appId);
  state.selectedMembership = next ? { ...next } : null;
}

async function loadAdmin(selection = null) {
  try {
    const payload = await request("/api/admin/bootstrap");

    state.apps = payload.apps;
    state.users = payload.users;
    state.memberships = payload.memberships;
    state.ownerQueue = payload.ownerQueue;

    if (selection) {
      state.selectedMembership = getMembership(selection.userId, selection.appId);
    } else {
      syncSelectedMembership();
    }

    renderMetrics(payload.metrics);
    renderUsers(payload.users);
    renderApps(payload.apps);
    renderMatrix(payload.apps);
    renderQueue(payload.ownerQueue);
    renderSwitchboard();
    populateRoleEditor();

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

      showFlash("Assignment saved.", "success");
      await loadAdmin({
        userId: Number(formData.get("userId")),
        appId: Number(formData.get("appId")),
      });
    } catch (error) {
      showFlash(error.message, "error");
    }
  });
}

if (removeAssignmentButton) {
  removeAssignmentButton.addEventListener("click", async () => {
    if (!state.selectedMembership) {
      showFlash("Select an assignment first.", "error");
      return;
    }

    try {
      await request("/api/admin/memberships/toggle", {
        method: "POST",
        body: JSON.stringify({
          userId: state.selectedMembership.userId,
          appId: state.selectedMembership.appId,
        }),
      });

      showFlash("Assignment removed from app.", "success");
      state.selectedMembership = null;
      await loadAdmin();
    } catch (error) {
      showFlash(error.message, "error");
    }
  });
}

loadAdmin();
