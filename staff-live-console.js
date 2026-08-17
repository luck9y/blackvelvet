const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";
const DONE_STORAGE_KEY = "blackVelvetConsoleDoneItems";
const REMOTE_TIMEOUT = 10000;

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const consoleButton = document.querySelector('[data-panel="systemConsole"]');
const consolePanel = document.getElementById("systemConsole");
const testButton = document.getElementById("testConsoleButton");

const allowedRoles = [
  "owner", "manager", "management", "admin", "administrator",
  "moderator", "mod", "helper", "staff"
];

const permanentOwners = [
  "imtherealluckyy",
  "imjustluckyy",
  "suoaz",
  "managergear",
  "gears"
];

let remoteErrors = [];
let localErrors = [];
let completedErrors = {};
let lastFailure = "";
let activeFilter = "errors";

function addConsoleStyles() {
  if (document.getElementById("console-status-styles")) return;

  const style = document.createElement("style");
  style.id = "console-status-styles";
  style.textContent = `
    .console-filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      width: 100%;
      margin-bottom: 18px;
    }

    .console-filter-tab {
      padding: 9px 14px;
      border: 1px solid #454d56;
      border-radius: 6px;
      color: #cbd2d8;
      background: #171b20;
      font: 700 12px Arial, sans-serif;
      cursor: pointer;
    }

    .console-filter-tab:hover,
    .console-filter-tab.active {
      color: #fff;
      background: #2a3037;
    }

    .console-filter-tab.errors.active {
      border-color: #e68e8e;
      color: #ffaaaa;
    }

    .console-filter-tab.warnings.active {
      border-color: #ffd866;
      color: #ffd866;
    }

    .console-filter-tab.fixed.active {
      border-color: #8df0a6;
      color: #8df0a6;
    }

    .console-section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #30363d;
      font: 700 14px Arial, sans-serif;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .console-section-heading.errors {
      color: #ff9292;
      border-color: rgba(230, 80, 80, .55);
    }

    .console-section-heading.warnings {
      color: #ffd866;
      border-color: rgba(245, 190, 55, .55);
    }

    .console-section-heading.fixed {
      color: #8df0a6;
      border-color: rgba(125, 220, 150, .55);
    }

    .console-section-count {
      min-width: 23px;
      padding: 3px 7px;
      border: 1px solid currentColor;
      border-radius: 999px;
      text-align: center;
      font-size: 11px;
    }

    .console-error-card {
      border-color: rgba(230, 80, 80, .8) !important;
      background: linear-gradient(
        135deg,
        rgba(115, 28, 28, .35),
        rgba(16, 10, 12, .96)
      ) !important;
    }

    .console-warning-card {
      border-color: rgba(245, 190, 55, .8) !important;
      background: linear-gradient(
        135deg,
        rgba(94, 69, 12, .35),
        rgba(14, 12, 6, .96)
      ) !important;
    }

    .console-fixed-card {
      border-color: rgba(125, 220, 150, .75) !important;
      background: linear-gradient(
        135deg,
        rgba(35, 105, 55, .3),
        rgba(8, 15, 10, .96)
      ) !important;
    }

    .console-error-card .log-status {
      color: #ffaaaa;
    }

    .console-warning-card .log-status {
      color: #ffd866;
    }

    .console-fixed-card .log-status {
      color: #8df0a6;
    }

    .console-error-label,
    .console-warning-label,
    .console-fixed-label {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .console-error-label {
      border: 1px solid #e68e8e;
      color: #ffaaaa;
      background: rgba(180, 40, 40, .16);
    }

    .console-warning-label {
      border: 1px solid #f5be37;
      color: #ffd866;
      background: rgba(245, 190, 55, .14);
    }

    .console-fixed-label {
      border: 1px solid #7ddc96;
      color: #8df0a6;
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

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getRole(profile) {
  return normalize(
    profile?.role ||
    profile?.staffRank ||
    profile?.staff_role ||
    profile?.staffRole ||
    profile?.user_role
  );
}

function getAccountType(profile) {
  return normalize(
    profile?.accountType ||
    profile?.account_type ||
    profile?.userType ||
    profile?.user_type ||
    profile?.type
  );
}

function isStaffProfile(profile) {
  const username = normalize(profile?.username);
  const role = getRole(profile);
  const accountType = getAccountType(profile);

  return Boolean(
    permanentOwners.includes(username) ||
    allowedRoles.includes(role) ||
    ["staff", "staff account", "owner", "manager", "admin"].includes(accountType) ||
    profile?.isStaff === true ||
    profile?.is_staff === true ||
    profile?.staff === true
  );
}

function canUseConsole() {
  return isStaffProfile(getProfile());
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
      button.classList.toggle(
        "active",
        button.dataset.panel === "staffGuide"
      );
    });
  }

  return allowed;
}

function makeLocalError(source, errorMessage, stack = "") {
  const profile = getProfile();
  const staff = isStaffProfile(profile);

  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    source,
    message: String(errorMessage || "Unknown error"),
    stack_trace: stack || null,
    page_url: location.href,
    username: profile?.username || null,
    user_role: getRole(profile) || null,
    account_type: staff ? "staff account" : "member account",
    accountType: staff ? "staff account" : "member account",
    is_staff: staff,
    device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
    browser: navigator.userAgent
  };
}

function readStoredData() {
  try {
    localErrors = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
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

function getErrorKey(error) {
  return [
    error.source || "",
    error.message || "",
    error.page_url || ""
  ].join("|");
}

function saveLocalError(error) {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    stored.unshift(error);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stored.slice(0, 500))
    );
  } catch {}

  localErrors.unshift(error);
  render();

  window.dispatchEvent(new CustomEvent("blackVelvetConsoleError", {
    detail: error
  }));
}

function isWarning(error) {
  const source = normalize(error.source);
  const messageText = normalize(error.message);

  return source.includes("warn") ||
    source.includes("warning") ||
    messageText.includes("console.warn") ||
    messageText.includes("warning");
}

function isFixed(error) {
  return Boolean(completedErrors[getErrorKey(error)]);
}

function setFixed(error, fixed) {
  const key = getErrorKey(error);

  if (fixed) {
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

function allErrors() {
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

function renderEmpty(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderCard(error, section) {
  const warning = isWarning(error);
  const fixed = section === "fixed";
  const key = escapeHtml(getErrorKey(error));
  const description = error.message || "Unknown error";
  const stack = error.stack_trace || "";

  const cardClass = fixed
    ? "console-fixed-card"
    : warning
      ? "console-warning-card"
      : "console-error-card";

  const label = fixed
    ? '<span class="console-fixed-label">✓ FIXED</span>'
    : warning
      ? '<span class="console-warning-label">⚠ WARNING</span>'
      : '<span class="console-error-label">✖ ERROR</span>';

  return `
    <article class="log-card ${cardClass}" data-console-card>
      <div class="log-main">
        ${label}
        <strong>${escapeHtml(error.source || "Error")}</strong>
        <span class="log-status">${escapeHtml(description)}</span>
      </div>

      <div class="log-meta">
        <span>${escapeHtml(
          new Date(error.created_at || Date.now()).toLocaleString()
        )}</span>
        <span>${escapeHtml(error.username || "Guest")}</span>
        <span>
          ACCOUNT TYPE:
          ${escapeHtml(
            String(
              error.account_type ||
              error.accountType ||
              "member account"
            ).toUpperCase()
          )}
        </span>
        <span>
          ROLE:
          ${escapeHtml(
            String(
              error.user_role ||
              error.staff_rank ||
              error.role ||
              "no role"
            ).toUpperCase()
          )}
        </span>
        <span>${escapeHtml(error.device_hex || "No device")}</span>
      </div>

      <p class="muted">${escapeHtml(
        error.page_url || "Unknown page"
      )}</p>

      <div class="console-description" data-console-description-panel>
        <span class="console-description-title">ISSUE DESCRIPTION</span>
        ${escapeHtml(description)}
        ${stack ? `<pre>${escapeHtml(stack)}</pre>` : ""}
      </div>

      <div class="console-actions">
        <button
          class="console-description-toggle"
          type="button"
          data-console-description="${key}"
          aria-expanded="false"
        >
          ✓ VIEW DESCRIPTION
        </button>

        <button
          class="console-done-button"
          type="button"
          data-console-done="${key}"
          aria-pressed="${fixed}"
        >
          ${fixed ? "↶ MOVE TO ACTIVE" : "✓ MARK AS FIXED"}
        </button>
      </div>
    </article>
  `;
}

function getFilteredErrors() {
  const errors = allErrors();
  const fixed = errors.filter(isFixed);
  const active = errors.filter(error => !isFixed(error));
  const warnings = active.filter(isWarning);
  const redErrors = active.filter(error => !isWarning(error));

  return {
    errors: redErrors,
    warnings,
    fixed
  };
}

function renderTabs(groups) {
  return `
    <div class="console-filter-tabs" role="tablist" aria-label="Console log status">
      <button
        class="console-filter-tab errors ${activeFilter === "errors" ? "active" : ""}"
        type="button"
        data-console-filter="errors"
        role="tab"
        aria-selected="${activeFilter === "errors"}"
      >
        Errors (${groups.errors.length})
      </button>

      <button
        class="console-filter-tab warnings ${activeFilter === "warnings" ? "active" : ""}"
        type="button"
        data-console-filter="warnings"
        role="tab"
        aria-selected="${activeFilter === "warnings"}"
      >
        Warnings (${groups.warnings.length})
      </button>

      <button
        class="console-filter-tab fixed ${activeFilter === "fixed" ? "active" : ""}"
        type="button"
        data-console-filter="fixed"
        role="tab"
        aria-selected="${activeFilter === "fixed"}"
      >
        Fixed (${groups.fixed.length})
      </button>
    </div>
  `;
}

function render() {
  if (!list) return;

  const groups = getFilteredErrors();
  const items = groups[activeFilter];

  if (count) {
    count.textContent = String(
      groups.errors.length + groups.warnings.length
    );
  }

  const title = activeFilter === "errors"
    ? "Errors"
    : activeFilter === "warnings"
      ? "Warnings"
      : "Fixed";

  const emptyText = activeFilter === "errors"
    ? "No active errors."
    : activeFilter === "warnings"
      ? "No active warnings."
      : "No fixed issues yet.";

  list.innerHTML = `
    ${renderTabs(groups)}
    <section class="console-section">
      <h4 class="console-section-heading ${activeFilter}">
        <span>${title}</span>
        <span class="console-section-count">${items.length}</span>
      </h4>

      <div class="log-list">
        ${items.length
          ? items.map(error =>
              renderCard(error, activeFilter)
            ).join("")
          : renderEmpty(emptyText)}
      </div>
    </section>
  `;
}

async function requestWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REMOTE_TIMEOUT
  );

  try {
    return await fetch(url, {
      ...options,
      mode: "cors",
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Supabase request timed out.");
    }

    throw new Error(
      "Supabase is unreachable. Check the Supabase URL or connection."
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function saveRemote(error) {
  const { id, ...payload } = error;

  const response = await requestWithTimeout(
    `${SUPABASE_URL}/rest/v1/system_errors`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    throw new Error(
      `${response.status}: ${await response.text()}`
    );
  }
}

function recordFailure(text, stack = "") {
  if (text === lastFailure) return;

  lastFailure = text;

  if (message) {
    message.textContent = text;
  }

  console.warn("[Black Velvet Console]", text, stack);
}

async function loadRemoteErrors() {
  if (!list || !applyConsoleAccess()) return;

  try {
    const response = await requestWithTimeout(
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
        `${response.status}: ${await response.text()}`
      );
    }

    remoteErrors = await response.json();

    if (message) {
      message.textContent =
        "Live console connected. Updating automatically.";
    }
  } catch (error) {
    recordFailure(
      `Console refresh unavailable: ${error.message}`,
      error.stack || ""
    );
  }

  readStoredData();
  render();
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
    message.textContent =
      "Test error added. Saving to Supabase...";
  }

  try {
    await saveRemote(error);

    if (message) {
      message.textContent = "Test error saved to Supabase.";
    }
  } catch (saveError) {
    if (message) {
      message.textContent =
        `Test error saved locally only: ${saveError.message}`;
    }
  }

  await loadRemoteErrors();
}

function installInteractions() {
  list?.addEventListener("click", event => {
    const filterButton = event.target.closest("[data-console-filter]");

    if (filterButton) {
      activeFilter = filterButton.dataset.consoleFilter || "errors";
      render();
      return;
    }

    const descriptionButton = event.target.closest(
      "[data-console-description]"
    );

    if (descriptionButton) {
      const card = descriptionButton.closest("[data-console-card]");
      const description = card?.querySelector(
        "[data-console-description-panel]"
      );

      if (!description) return;

      const visible = description.classList.toggle("is-visible");

      descriptionButton.setAttribute(
        "aria-expanded",
        String(visible)
      );

      descriptionButton.textContent = visible
        ? "✓ HIDE DESCRIPTION"
        : "✓ VIEW DESCRIPTION";

      return;
    }

    const doneButton = event.target.closest("[data-console-done]");
    if (!doneButton) return;

    const error = allErrors().find(item =>
      getErrorKey(item) === doneButton.dataset.consoleDone
    );

    if (error) {
      setFixed(error, !isFixed(error));
    }
  });

  testButton?.addEventListener("click", testLiveConsole);
}

function start() {
  if (!list) return;

  addConsoleStyles();
  applyConsoleAccess();
  installInteractions();
  readStoredData();
  render();

  if (message) {
    message.textContent =
      "Live console started. Waiting for updates...";
  }

  window.addEventListener(
    "blackVelvetConsoleError",
    event => {
      if (event.detail && canUseConsole()) {
        localErrors.unshift(event.detail);
        render();
      }
    }
  );

  window.addEventListener("storage", event => {
    if (
      event.key === STORAGE_KEY ||
      event.key === DONE_STORAGE_KEY
    ) {
      readStoredData();
      render();
    }

    if (event.key === "blackVelvetProfile") {
      applyConsoleAccess();
      loadRemoteErrors();
    }
  });

  loadRemoteErrors();

  setInterval(() => {
    if (canUseConsole()) {
      loadRemoteErrors();
    }
  }, 5000);
}

start();
