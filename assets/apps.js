const apps = [
  {
    name: "Feud App",
    slug: "feud-app",
    homepagePreviewUrl: "https://feudapp.mlounello.com",
    redirectUrl: "/apps/feud-app",
    description: "Fast-paced game and prompt workflow app built for live interaction and audience play.",
  },
  {
    name: "Siena Map App",
    slug: "siena-map-app",
    homepagePreviewUrl: "https://sienamapapp.mlounello.com",
    redirectUrl: "/apps/siena-map-app",
    description: "Campus and location mapping tools built for guided navigation and place-based information.",
  },
  {
    name: "Lighting Color App",
    slug: "lighting-color-app",
    homepagePreviewUrl: "https://lightingcolorapp.mlounello.com",
    redirectUrl: "/apps/lighting-color-app",
    description: "Color workflow app for lighting design, palettes, and practical production reference.",
  },
  {
    name: "Playbill App",
    slug: "playbill-app",
    homepagePreviewUrl: "https://playbillapp.mlounello.com/preview",
    redirectUrl: "/apps/playbill-app",
    description: "Program and publishing workflow app for show information, editorial passes, and output review.",
  },
  {
    name: "Show Prep App",
    slug: "showprep-app",
    homepagePreviewUrl: "https://showprepapp.mlounello.com",
    redirectUrl: "/apps/showprep-app",
    description: "Show preparation and task tracking app for production workflows.",
  },
  {
    name: "GoboPad",
    slug: "gobopad",
    homepagePreviewUrl: "https://gobopad.mlounello.com",
    redirectUrl: "/apps/gobopad",
    description: "Lighting-focused utility for faster show planning and pad workflows.",
  },
  {
    name: "Theatre Budget App",
    slug: "theatre-budget-app",
    homepagePreviewUrl: "https://theatrebudgetapp.mlounello.com",
    redirectUrl: "/apps/theatre-budget-app",
    description: "Production budgeting tools built for theatre teams and managers.",
  },
  {
    name: "DomeImages",
    slug: "domeimages",
    homepagePreviewUrl: "https://sienadome.mlounello.com",
    redirectUrl: "/apps/domeimages",
    description: "Image workflows and galleries tailored for dome-based visual projects.",
  },
  {
    name: "Siena Wheel App",
    slug: "siena-wheel",
    homepagePreviewUrl: "https://sienawheel.mlounello.com",
    redirectUrl: "/apps/siena-wheel",
    description: "Interactive wheel app built for guided decisions and classroom activities.",
  },
  {
    name: "Alcohol Origins App",
    slug: "alcohol-origins",
    homepagePreviewUrl: "https://alcoholorigins.mlounello.com",
    redirectUrl: "/apps/alcohol-origins",
    description: "Explore drinks, regions, and historical context by origin.",
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

    const previewInner = `
      <iframe
        class="preview-frame"
        title="${app.name} preview"
        src="${app.homepagePreviewUrl}"
        loading="lazy"
        scrolling="no"
        tabindex="-1"
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
      ></iframe>
    `;

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
          aria-label="Open ${app.name} homepage"
        ></a>
        ${previewInner}
      </div>
      <p class="app-route">Public homepage preview: ${app.homepagePreviewUrl}</p>
    `;

    appsGrid.appendChild(card);
  });

  scalePreviews();
  window.addEventListener("resize", scalePreviews);
}
