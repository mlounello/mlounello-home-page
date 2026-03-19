const apps = [
  {
    name: "GoboPad",
    environment: "Production",
    users: 12,
    roleModel: "Owner / Admin / Crew",
    status: "Live",
    note: "Lighting workflow app with active production access.",
  },
  {
    name: "Theatre Budget App",
    environment: "Production",
    users: 9,
    roleModel: "Owner / Finance / Viewer",
    status: "Live",
    note: "Budget access should stay tightly scoped by department.",
  },
  {
    name: "DomeImages",
    environment: "Production",
    users: 6,
    roleModel: "Owner / Editor / Viewer",
    status: "Live",
    note: "Media library with shared asset visibility rules.",
  },
  {
    name: "Siena Wheel",
    environment: "Production",
    users: 18,
    roleModel: "Owner / Instructor / Viewer",
    status: "Live",
    note: "Broader classroom-facing access with simpler role tiers.",
  },
  {
    name: "Alcohol Origins",
    environment: "Pilot",
    users: 4,
    roleModel: "Owner / Editor / Viewer",
    status: "Pilot",
    note: "Editorial access should stay limited while content settles.",
  },
  {
    name: "ShowPrep App",
    environment: "Production",
    users: 14,
    roleModel: "Owner / Stage Manager / Crew",
    status: "Live",
    note: "Operational app where role boundaries affect day-of-show work.",
  },
];

const users = [
  {
    name: "Mike Lounello",
    email: "owner@mlounello.com",
    role: "Owner",
    status: "Active",
    apps: ["All apps"],
    alert: "Primary owner account",
  },
  {
    name: "Production Admin",
    email: "admin@showprepapp.mlounello.com",
    role: "Admin",
    status: "Active",
    apps: ["ShowPrep App", "GoboPad"],
    alert: "Review MFA every quarter",
  },
  {
    name: "Finance Lead",
    email: "finance@theatrebudgetapp.mlounello.com",
    role: "Finance",
    status: "Active",
    apps: ["Theatre Budget App"],
    alert: "Budget export rights enabled",
  },
  {
    name: "Content Editor",
    email: "editor@alcoholorigins.mlounello.com",
    role: "Editor",
    status: "Pending review",
    apps: ["Alcohol Origins", "DomeImages"],
    alert: "Needs owner approval",
  },
];

const ownerQueue = [
  "Put `/admin` behind Cloudflare Access and allow only your Google account.",
  "Move user/app assignments into a shared database so this dashboard becomes live.",
  "Normalize role names across apps so assignment rules stay predictable.",
  "Add audit logging for role changes and app access grants.",
];

const metricContainer = document.getElementById("adminMetrics");
const directoryContainer = document.getElementById("userDirectory");
const appContainer = document.getElementById("adminApps");
const matrixContainer = document.getElementById("permissionMatrix");
const queueContainer = document.getElementById("ownerQueue");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
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

if (metricContainer) {
  const liveApps = apps.filter((app) => app.status === "Live").length;
  const totalUsers = apps.reduce((sum, app) => sum + app.users, 0);

  metricContainer.innerHTML = [
    createMetric("Hosted apps", apps.length, "One central index"),
    createMetric("Live apps", liveApps, "Production-ready and assigned"),
    createMetric("Managed seats", totalUsers, "Across all hosted apps"),
    createMetric("Owner actions", ownerQueue.length, "Current control-room queue"),
  ].join("");
}

if (directoryContainer) {
  directoryContainer.innerHTML = users
    .map(
      (user) => `
        <article class="directory-card">
          <div class="directory-head">
            <div>
              <h3>${user.name}</h3>
              <p class="directory-email">${user.email}</p>
            </div>
            <span class="directory-status">${user.status}</span>
          </div>
          <div class="directory-meta">
            <p><span>Role</span>${user.role}</p>
            <p><span>Apps</span>${user.apps.join(", ")}</p>
            <p><span>Attention</span>${user.alert}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

if (appContainer) {
  appContainer.innerHTML = apps
    .map(
      (app) => `
        <article class="hosted-app-card">
          <div class="hosted-app-head">
            <h3>${app.name}</h3>
            <span class="status-chip">${app.status}</span>
          </div>
          <p class="hosted-app-note">${app.note}</p>
          <div class="hosted-app-meta">
            <p><span>Environment</span>${app.environment}</p>
            <p><span>Users</span>${app.users}</p>
            <p><span>Role model</span>${app.roleModel}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

if (matrixContainer) {
  matrixContainer.innerHTML = `
    <div class="matrix-row matrix-head">
      <span>App</span>
      <span>Owner</span>
      <span>Admin</span>
      <span>Editor / Ops</span>
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

if (queueContainer) {
  queueContainer.innerHTML = ownerQueue
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
