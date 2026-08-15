import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const allowedRoles = ["Owner", "Manager"];
const originalConsoleError = console.error.bind(console);
const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const clearButton = document.getElementById("clearConsoleButton");

let errors = [];
let savingError = false;
let lastSignature = "";
let lastSignatureTime = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
  } catch {
    return null;
  }
}

function getRole() {
  const profile = getProfile();
  return profile?.role || profile?.staffRank || "";
}

function canUseConsole() {
  return allowedRoles.includes(getRole());
}

function deviceHex() {
  return localStorage.getItem("blackVelvetDeviceHex") || "";
}

function setConsoleVisibility() {
  const allowed = canUseConsole();

  document.querySelectorAll(".manager-owner-only").forEach(element => {
    element.classList.toggle("hidden", !allowed);
  });

  if (!allowed) {
    const activeConsolePanel = document.querySelector(
      "#systemConsole.active-panel"
    );

    if (activeConsolePanel) {
      activeConsolePanel.classList.remove("active-panel");
      document.getElementById("staffGuide")?.classList.add("active-panel");

      document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.panel === "staffGuide"
        );
      });
    }
  }
}

function stringifyPart(part) {
  if (part instanceof Error) {
    return part.stack || part.message;
  }

  if (typeof part === "object") {
    try {
      return JSON.stringify(part);
    } catch {
      return String(part);
    }
  }

  return String(part);
}

async function saveError(source, error, extraStack = "") {
  if (savingError) return;

  const errorMessage = error instanceof Error
    ? error.message
    : stringifyPart(error);

  const stack = error instanceof Error
    ? error.stack || extraStack
    : extraStack;

  if (!errorMessage || errorMessage.includes("system_errors")) return;

  const signature = `${source}:${errorMessage}`;
  const now = Date.now();

  if (signature === lastSignature && now - lastSignatureTime < 3000) {
    return;
  }

  lastSignature = signature;
  lastSignatureTime = now;
  savingError = true;

  try {
    const profile = getProfile();

    await supabase.from("system_errors").insert({
      source,
      message: errorMessage.slice(0, 4000),
      stack_trace: String(stack || "").slice(0, 12000) || null,
      page_url: window.location.href,
      username: profile?.username || null,
      user_role: profile?.role || profile?.staffRank || null,
      device_hex: deviceHex() || null,
      browser: navigator.userAgent
    });
  } catch {
    // Prevent recursive console errors.
  } finally {
    savingError = false;
  }
}

function renderErrors() {
  if (!list || !count) return;

  count.textContent = String(errors.length);

  list.innerHTML = errors.length
    ? errors.map(error => `
        <article class="log-card console-error-card">
          <div class="log-title">
            <span>${escapeHtml(error.source)}</span>
            <span class="log-status">ERROR</span>
          </div>

          <div class="log-grid">
            <div class="log-field">
              <span>Message</span>
              <strong>${escapeHtml(error.message)}</strong>
            </div>
            <div class="log-field">
              <span>User</span>
              <strong>${escapeHtml(error.username || "Not signed in")}</strong>
            </div>
            <div class="log-field">
              <span>Role</span>
              <strong>${escapeHtml(error.user_role || "N/A")}</strong>
            </div>
            <div class="log-field">
              <span>Device Hex</span>
              <strong>${escapeHtml(error.device_hex || "Unknown")}</strong>
            </div>
            <div class="log-field">
              <span>Page</span>
              <strong>${escapeHtml(error.page_url || "Unknown")}</strong>
            </div>
            <div class="log-field">
              <span>Time</span>
              <strong>${escapeHtml(error.created_at)}</strong>
            </div>
          </div>

          ${error.stack_trace ? `
            <details class="console-details">
              <summary>View technical details</summary>
              <pre>${escapeHtml(error.stack_trace)}</pre>
            </details>
          ` : ""}
        </article>
      `).join("")
    : '<div class="empty-state">No console errors recorded.</div>';
}

async function loadErrors() {
  if (!canUseConsole()) {
    errors = [];
    renderErrors();
    return;
  }

  const { data, error } = await supabase
    .from("system_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    originalConsoleError(
      "Could not load the staff console:",
      error.message
    );
    return;
  }

  errors = data || [];
  renderErrors();
}

console.error = (...parts) => {
  originalConsoleError(...parts);

  const combined = parts.map(stringifyPart).join(" ");
  const firstError = parts.find(part => part instanceof Error);

  saveError(
    "console.error",
    combined,
    firstError?.stack || new Error().stack || ""
  );
};

window.addEventListener("error", event => {
  saveError(
    "window.error",
    event.error || event.message || "Unknown browser error",
    event.error?.stack ||
      `${event.filename}:${event.lineno}:${event.colno}`
  );
});

window.addEventListener("unhandledrejection", event => {
  saveError(
    "unhandledrejection",
    event.reason || "Unhandled promise rejection"
  );
});

clearButton?.addEventListener("click", async () => {
  if (!canUseConsole()) return;

  if (!window.confirm("Clear all recorded console errors?")) return;

  clearButton.disabled = true;
  message.textContent = "Clearing console...";
  message.className = "action-message";

  const { error } = await supabase
    .from("system_errors")
    .delete()
    .gte("id", 0);

  clearButton.disabled = false;

  if (error) {
    message.textContent = `Could not clear console: ${error.message}`;
    message.className = "action-message error";
    return;
  }

  message.textContent = "Console errors cleared.";
  message.className = "action-message success";
  await loadErrors();
});

document
  .querySelector('[data-panel="systemConsole"]')
  ?.addEventListener("click", loadErrors);

window.addEventListener("storage", event => {
  if (event.key === "blackVelvetProfile") {
    setConsoleVisibility();
    loadErrors();
  }
});

const visibilityObserver = new MutationObserver(setConsoleVisibility);
const portal = document.getElementById("portalView");

if (portal) {
  visibilityObserver.observe(portal, {
    attributes: true,
    attributeFilter: ["class"]
  });
}

setInterval(setConsoleVisibility, 750);

setConsoleVisibility();
await loadErrors();

supabase
  .channel("staff-system-errors")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "system_errors"
    },
    loadErrors
  )
  .subscribe();

await import("./staff-account-manager.js");
