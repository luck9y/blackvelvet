const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";
const DONE_STORAGE_KEY = "blackVelvetConsoleDoneItems";

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const consoleButton = document.querySelector('[data-panel="systemConsole"]');
const consolePanel = document.getElementById("systemConsole");
const testButton = document.getElementById("testConsoleButton");

const allowedRoles = ["owner", "manager"];
const permanentOwners = ["imtherealluckyy", "suoaz"];

let remoteErrors = [];
let localErrors = [];
let completedErrors = {};
let lastSupabaseFailure = "";
let lastSupabaseFailureTime = 0;
let diagnosticsComplete = false;

function addConsoleStyles() {
  if (document.getElementById("console-status-styles")) return;

  const style = document.createElement("style");
  style.id = "console-status-styles";
  style.textContent = `
    .console-warning-card {
      border-color: rgba(245, 190, 55, .78) !important;
      background: linear-gradient(135deg, rgba(94, 69, 12, .32), rgba(8, 9, 6, .96)) !important;
    }

    .console-warning-card .log-status {
      color: #ffd866 !important;
    }

    .console-warning-label {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 8px;
      padding: 4px 8px;
      border: 1px solid rgba(245, 190, 55, .75);
      border-radius: 5px;
      color: #ffd866;
      background: rgba(245, 190, 55, .14);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .console-done-card {
      opacity: .52;
      border-color: rgba(125, 220, 150, .45) !important;
    }

    .console-done-card .console-done-button {
      color: #8df0a6;
      border-color: rgba(125, 220, 150, .7);
      background: rgba(40, 160, 80, .16);
    }

    .console-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .console-done-button,
    .console-description-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border: 1px solid rgba(220, 230, 236, .35);
      border-radius: 6px;
      color: #dce6ec;
      background: rgba(220, 230, 236, .07);
      font: 700 10px Arial, sans-serif;
      letter-spacing: 1px;
      cursor: pointer;
    }

    .console-done-button:hover,
    .console-description-toggle:hover {
      border-color: #8df0a6;
      color: #8df0a6;
    }

    .console-description {
      display: none;
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid #8df0a6;
      border-radius: 5px;
      color: #dce6ec;
      background: rgba(0, 0, 0, .3);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 13px/1.55 Arial, sans-serif;
    }

    .console-description.is-visible {
      display: block;
    }

    .console-description-title {
      display: block;
      margin-bottom: 6px;
      color: #8df0a6;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .console-description pre {
      margin: 10px 0 0;
      color: #b8c4ca;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 12px/1.5 monospace;
    }
  `;

  document.head.appendChild(style);
}

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

function canUseConsole() {
  const profile = getProfile();
  const username = String(profile?.username || "").toLowerCase();
  const role = String(profile?.role || profile?.staffRank || "").toLowerCase();

  return permanentOwners.includes(username) || allowedRoles.includes(role);
}

function applyConsoleAccess() {
  const allowed = canUseConsole();

  consoleButton?.classList.toggle("hidden", !allowed);
  consolePanel?.classList.toggle("hidden", !allowed);

  if (!allowed && consolePanel?.classList.contains("active-panel")) {
    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.toggle("active-panel", panel.id === "staffGuide");
    });

    document.querySelectorAll(".nav-button").forEach(button => {
      button.classList.toggle("active", button.dataset.panel === "staffGuide");
    });
  }

  return allowed;
}

function makeLocalError(source, errorMessage, stack = "") {
  const profile = getProfile();

  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    source,
    message: String(errorMessage || "Unknown error"),
    stack_trace: stack || null,
    page_url: location.href,
    username: profile?.username || null,
    user_role: profile?.role || profile?.staffRank || null,
    device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
    browser: navigator.userAgent
  };
}

function readLocalErrors() {
  try {
    localErrors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    localErrors = [];
  }

  try {
    completedErrors = JSON.parse(
      localStorage.getItem(DONE_STORAGE_KEY) || "{}"
    );
  } catch {
    completedErrors = {};
  }
}

function saveLocalError(error) {
  try {
    const errors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    errors.unshift(error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, 500)));
  } catch {}

  localErrors.unshift(error);
  render();

  window.dispatchEvent(new CustomEvent("blackVelvetConsoleError", {
    detail: error
  }));
}

function getErrorKey(error) {
  return [
    error.source || "",
    error.message || "",
    error.page_url || ""
  ].join("|");
}

function isWarning(error) {
  const source = String(error.source || "").toLowerCase();
  const messageText = String(error.message || "").toLowerCase();

  return source.includes("warn") ||
    source.includes("warning") ||
    messageText.includes("console.warn") ||
    messageText.includes("warning");
}

function isDone(error) {
  return Boolean(completedErrors[getErrorKey(error)]);
}

function setDone(error, done) {
  const key = getErrorKey(error);

  if (done) {
    completedErrors[key] = true;
  } else {
    delete completedErrors[key];
  }

  try {
    localStorage.setItem(
      DONE_STORAGE_KEY,
      JSON.stringify(completedErrors)
    );
  } catch {}

  render();
}

function uniqueErrors() {
  const seen = new Set();

  return [...localErrors, ...remoteErrors]
    .filter(error => {
      const key = [
        error.id,
        error.created_at,
        error.source,
        error.message,
        error.page_url
      ].join("|");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )
    .slice(0, 500);
}

function render() {
  if (!list) return;

  const errors = uniqueErrors();
  const activeCount = errors.filter(error => !isDone(error)).length;

  if (count) count.textContent = activeCount;

  if (!errors.length) {
    list.innerHTML = `
      <div class="empty-state">
        No console errors captured yet. Click Test Live Error to verify it is working.
      </div>
    `;
    return;
  }

  list.innerHTML = errors.map(error => {
    const warning = isWarning(error);
    const done = isDone(error);
    const cardClasses = [
      "log-card",
      "console-error-card",
      warning ? "console-warning-card" : "",
      done ? "console-done-card" : ""
    ].filter(Boolean).join(" ");

    const description = error.message || "Unknown error";
    const stack = error.stack_trace || "";

    return `
      <article class="${cardClasses}">
        <div class="log-main">
          ${warning ? '<span class="console-warning-label">⚠ WARNING</span>' : ""}
          <strong>${escapeHtml(error.source || "Error")}</strong>
          <span class="log-status">${escapeHtml(description)}</span>
        </div>

        <div class="log-meta">
          <span>${escapeHtml(new Date(error.created_at || Date.now()).toLocaleString())}</span>
          <span>${escapeHtml(error.username || "Guest")}</span>
          <span>${escapeHtml(error.user_role || "No role")}</span>
          <span>${escapeHtml(error.device_hex || "No device")}</span>
        </div>

        <p class="muted">${escapeHtml(error.page_url || "Unknown page")}</p>

        <div class="console-description" data-console-description-panel>
          <span class="console-description-title">ERROR DESCRIPTION</span>
          ${escapeHtml(description)}
          ${stack ? `<pre>${escapeHtml(stack)}</pre>` : ""}
        </div>

        <div class="console-actions">
          <button
            class="console-description-toggle"
            type="button"
            data-console-description="${escapeHtml(getErrorKey(error))}"
            aria-expanded="false"
          >
            ✓ VIEW DESCRIPTION
          </button>

          <button
            class="console-done-button"
            type="button"
            data-console-done="${escapeHtml(getErrorKey(error))}"
            aria-pressed="${done}"
          >
            ${done ? "✓ DONE — UNCHECK" : "☐ MARK AS DONE"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

async function saveRemote(error) {
  const { id, ...payload } = error;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/system_errors`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}: ${await response.text()}`
    );
  }
}

function recordSupabaseFailure(text, stack = "") {
  const now = Date.now();

  if (
    text === lastSupabaseFailure &&
    now - lastSupabaseFailureTime < 6000
  ) {
    return;
  }

  lastSupabaseFailure = text;
  lastSupabaseFailureTime = now;

  saveLocalError(makeLocalError("staff.console.supabase", text, stack));
}

async function checkColumn(table, column) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  if (!response.ok) {
    const details = await response.text();

    const readableMessage = details.toLowerCase().includes("column") ||
      details.toLowerCase().includes("schema cache")
        ? `NOT FOUND: "${column}" is missing from the "${table}" table in Supabase.`
        : `Could not check "${column}" on "${table}". Details: ${details}`;

    saveLocalError(makeLocalError(
      "database.schema",
      readableMessage,
      details
    ));

    return false;
  }

  return true;
}

async function runDiagnostics() {
  if (diagnosticsComplete || !canUseConsole()) return;

  diagnosticsComplete = true;

  const checks = [
    ["applications", "avatar_url"],
    ["clan_member_applications", "avatar_url"],
    ["clan_members", "avatar_url"],
    ["clan_members", "password_hash"],
    ["system_errors", "source"]
  ];

  for (const [table, column] of checks) {
    try {
      await checkColumn(table, column);
    } catch (error) {
      saveLocalError(makeLocalError(
        "database.connection",
        `Could not inspect "${table}.${column}". ${error.message}`,
        error.stack || ""
      ));
    }
  }

  if (message && diagnosticsComplete) {
    message.textContent = "Console connected. Database diagnostics completed.";
  }

  render();
}

async function loadRemoteErrors() {
  if (!list || !applyConsoleAccess()) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/system_errors?select=*&order=created_at.desc&limit=200`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}: ${await response.text()}`
      );
    }

    remoteErrors = await response.json();

    if (message) {
      message.textContent = "Live console connected. Errors are being saved.";
    }
  } catch (error) {
    const text = `Supabase console load failed. Details: ${error.message}`;

    if (message) message.textContent = text;

    recordSupabaseFailure(text, error.stack || "");
  }

  readLocalErrors();
  render();

  await runDiagnostics();
}

async function testLiveConsole() {
  if (!applyConsoleAccess()) return;

  const error = makeLocalError(
    "test.live.button",
    "Black Velvet live console test error. The button is working.",
    new Error("Black Velvet live console test stack").stack
  );

  saveLocalError(error);

  if (message) {
    message.textContent = "Test error added locally. Saving to Supabase...";
  }

  try {
    await saveRemote(error);

    if (message) {
      message.textContent = "Test error added locally and saved to Supabase.";
    }
  } catch (saveError) {
    const text =
      `Test error saved locally, but Supabase rejected it. Details: ${saveError.message}`;

    if (message) message.textContent = text;

    recordSupabaseFailure(text, saveError.stack || "");
  }

  await loadRemoteErrors();
}

function installNavigation() {
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.panel === "systemConsole" && !canUseConsole()) {
        return;
      }

      document.querySelectorAll(".nav-button").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      document.querySelectorAll(".panel").forEach(panel => {
        panel.classList.toggle(
          "active-panel",
          panel.id === button.dataset.panel
        );
      });
    });
  });
}

function installDoneButtons() {
  list?.addEventListener("click", event => {
    const descriptionButton = event.target.closest("[data-console-description]");

    if (descriptionButton) {
      const card = descriptionButton.closest(".console-error-card");
      const description = card?.querySelector("[data-console-description-panel]");
      if (!description) return;

      const visible = description.classList.toggle("is-visible");
      descriptionButton.setAttribute("aria-expanded", String(visible));
      descriptionButton.textContent = visible
        ? "✓ HIDE DESCRIPTION"
        : "✓ VIEW DESCRIPTION";
      return;
    }

    const doneButton = event.target.closest("[data-console-done]");
    if (!doneButton) return;

    const error = uniqueErrors().find(
      item => getErrorKey(item) === doneButton.dataset.consoleDone
    );

    if (error) {
      setDone(error, !isDone(error));
    }
  });
}

function start() {
  if (!list) return;

  addConsoleStyles();
  applyConsoleAccess();
  installNavigation();
  installDoneButtons();
  readLocalErrors();
  render();

  if (message) {
    message.textContent = "Live console started. Waiting for page errors...";
  }

  testButton?.addEventListener("click", testLiveConsole);

  window.addEventListener("blackVelvetConsoleError", event => {
    if (!event.detail || !canUseConsole()) return;

    localErrors.unshift(event.detail);
    render();
  });

  window.addEventListener("storage", event => {
    if (event.key === "blackVelvetProfile") {
      diagnosticsComplete = false;
      applyConsoleAccess();
      readLocalErrors();
      render();
      runDiagnostics();
    }
  });

  loadRemoteErrors();

  setInterval(() => {
    if (canUseConsole()) {
      loadRemoteErrors();
    }
  }, 10000);
}

start();
