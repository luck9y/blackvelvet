import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const allowedRoles = ["Owner", "Manager"];
const permanentOwners = ["imjustluckyy", "suoaz"];

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const clearButton = document.getElementById("clearConsoleButton");

let errors = [];

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
  const profile = getProfile();
  const username = String(profile?.username || "").toLowerCase();

  return permanentOwners.includes(username) || allowedRoles.includes(getRole());
}

function setMessage(text, type = "") {
  if (!message) return;

  message.textContent = text;
  message.className = `action-message ${type}`;
}

function setConsoleVisibility() {
  const allowed = canUseConsole();

  document.querySelectorAll(".manager-owner-only").forEach(element => {
    element.classList.toggle("hidden", !allowed);
  });

  if (!allowed) {
    const activeConsolePanel = document.querySelector("#systemConsole.active-panel");

    if (activeConsolePanel) {
      activeConsolePanel.classList.remove("active-panel");
      document.getElementById("staffGuide")?.classList.add("active-panel");

      document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.toggle("active", button.dataset.panel === "staffGuide");
      });
    }
  }
}

function installTestButton() {
  if (!clearButton || document.getElementById("testConsoleButton")) return;

  const testButton = document.createElement("button");
  testButton.id = "testConsoleButton";
  testButton.className = "secondary-button";
  testButton.type = "button";
  testButton.textContent = "Test Error";

  clearButton.before(testButton);

  testButton.addEventListener("click", () => {
    console.error(new Error("Black Velvet test console error"));
    setMessage("Test error sent. It should appear within a few seconds.", "success");

    setTimeout(loadErrors, 1500);
  });
}

function renderErrors() {
  if (!list || !count) return;

  count.textContent = String(errors.length);

  list.innerHTML = errors.length
    ? errors.map(error => `
        <article class="log-card console-error-card">
          <div class="log-title">
            <span>${escapeHtml(error.source || "Unknown source")}</span>
            <span class="log-status">ERROR</span>
          </div>

          <div class="log-grid">
            <div class="log-field"><span>Message</span><strong>${escapeHtml(error.message)}</strong></div>
            <div class="log-field"><span>User</span><strong>${escapeHtml(error.username || "Not signed in")}</strong></div>
            <div class="log-field"><span>Role</span><strong>${escapeHtml(error.user_role || "N/A")}</strong></div>
            <div class="log-field"><span>Device Hex</span><strong>${escapeHtml(error.device_hex || "Unknown")}</strong></div>
            <div class="log-field"><span>Page</span><strong>${escapeHtml(error.page_url || "Unknown")}</strong></div>
            <div class="log-field"><span>Time</span><strong>${escapeHtml(new Date(error.created_at).toLocaleString())}</strong></div>
          </div>

          ${error.stack_trace ? `
            <details class="console-details">
              <summary>View technical details</summary>
              <pre>${escapeHtml(error.stack_trace)}</pre>
            </details>
          ` : ""}
        </article>
      `).join("")
    : '<div class="empty-state">No console errors recorded. Click Test Error to confirm reporting works.</div>';
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
    setMessage(`Console load failed: ${error.message}. Check staff-console.sql and Supabase RLS policies.`, "error");
    return;
  }

  errors = data || [];
  renderErrors();

  if (!message?.textContent?.startsWith("Test error sent")) {
    setMessage(errors.length ? `${errors.length} console error(s) loaded.` : "Console connected. No errors recorded.", "success");
  }
}

clearButton?.addEventListener("click", async () => {
  if (!canUseConsole()) return;
  if (!window.confirm("Clear all recorded console errors?")) return;

  clearButton.disabled = true;
  setMessage("Clearing console...");

  const { error } = await supabase.from("system_errors").delete().gt("id", 0);

  clearButton.disabled = false;

  if (error) {
    setMessage(`Could not clear console: ${error.message}`, "error");
    return;
  }

  setMessage("Console errors cleared.", "success");
  await loadErrors();
});

document.querySelector('[data-panel="systemConsole"]')?.addEventListener("click", loadErrors);

window.addEventListener("storage", event => {
  if (event.key === "blackVelvetProfile") {
    setConsoleVisibility();
    loadErrors();
  }
});

const portal = document.getElementById("portalView");

if (portal) {
  new MutationObserver(() => {
    setConsoleVisibility();
    loadErrors();
  }).observe(portal, {
    attributes: true,
    attributeFilter: ["class"]
  });
}

installTestButton();
setConsoleVisibility();
await loadErrors();

setInterval(() => {
  setConsoleVisibility();

  if (canUseConsole()) {
    loadErrors();
  }
}, 8000);

supabase
  .channel("staff-system-errors")
  .on("postgres_changes", { event: "*", schema: "public", table: "system_errors" }, loadErrors)
  .subscribe();

await import("./staff-account-manager.js");
