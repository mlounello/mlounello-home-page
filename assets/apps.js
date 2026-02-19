const apps = [
  {
    name: "GoboPad",
    slug: "gobopad",
    previewUrl: "https://gobopad.mlounello.com",
    redirectUrl: "/apps/gobopad",
    description: "Lighting-focused utility for faster show planning and pad workflows.",
  },
  {
    name: "Theatre Budget App",
    slug: "theatre-budget-app",
    previewUrl: "https://theatrebudgetapp.mlounello.com",
    redirectUrl: "/apps/theatre-budget-app",
    description: "Production budgeting tools built for theatre teams and managers.",
  },
  {
    name: "DomeImages",
    slug: "domeimages",
    previewUrl: "https://sienadome.mlounello.com",
    redirectUrl: "/apps/domeimages",
    description: "Image workflows and galleries tailored for dome-based visual projects.",
  },
  {
    name: "Siena Wheel",
    slug: "siena-wheel",
    previewUrl: "https://sienawheel.mlounello.com",
    redirectUrl: "/apps/siena-wheel",
    description: "Interactive wheel app built for guided decisions and classroom activities.",
  },
  {
    name: "Alcohol Origins",
    slug: "alcohol-origins",
    previewUrl: "https://alcoholorigins.mlounello.com",
    redirectUrl: "/apps/alcohol-origins",
    description: "Explore drinks, regions, and historical context by origin.",
  },
  {
    name: "ShowPrep App",
    slug: "showprep-app",
    previewUrl: "https://showprepapp.mlounello.com",
    redirectUrl: "/apps/showprep-app",
    description: "Show preparation and task tracking app for production workflows.",
  },
];

const appsGrid = document.getElementById("appsGrid");
const year = document.getElementById("year");
const PREVIEW_WIDTH = 1600;
const PREVIEW_HEIGHT = 900;

if (year) {
  year.textContent = new Date().getFullYear();
}

function scalePreviews() {
  document.querySelectorAll(".preview-shell").forEach((shell) => {
    const frame = shell.querySelector(".preview-frame");
    if (!frame) {
      return;
    }

    const shellWidth = shell.clientWidth;
    const shellHeight = shell.clientHeight;
    const scale = Math.min(shellWidth / PREVIEW_WIDTH, shellHeight / PREVIEW_HEIGHT);
    const offsetX = (shellWidth - PREVIEW_WIDTH * scale) / 2;
    const offsetY = (shellHeight - PREVIEW_HEIGHT * scale) / 2;

    frame.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  });
}

if (appsGrid) {
  apps.forEach((app) => {
    const card = document.createElement("article");
    card.className = "app-card";

    card.innerHTML = `
      <div class="app-head">
        <h2>${app.name}</h2>
        <a class="launch-link" href="${app.redirectUrl}" target="_blank" rel="noopener noreferrer">
          Open app
        </a>
      </div>
      <p class="app-copy">${app.description}</p>
      <div class="preview-shell">
        <a
          class="preview-link"
          href="${app.redirectUrl}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open ${app.name}"
        ></a>
        <iframe
          class="preview-frame"
          title="${app.name} preview"
          src="${app.previewUrl}"
          loading="lazy"
          scrolling="no"
          tabindex="-1"
          referrerpolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        ></iframe>
      </div>
      <p class="app-route">Redirect route: ${app.redirectUrl}</p>
    `;

    appsGrid.appendChild(card);
  });

  scalePreviews();
  window.addEventListener("resize", scalePreviews);
}
