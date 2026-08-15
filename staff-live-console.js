const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";

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
let lastSupabaseFailure = "";
let lastSupabaseFailureTime = 0;

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

  return permanentOwners.includes(username) ||
    allowedRoles.includes(role);
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
    localErrors = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
  } catch {
    localErrors = [];
  }
}

function saveLocalError(error) {
  try {
    const errors = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    errors.unshift(error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, 500)));
  } catch {}

  localErrors.unshift(error);
  render();

  window.dispatchEvent(new CustomEvent("blackVelvetConsoleError", {
    detail: error
  }));
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

  if (count) {
    count.textContent = errors.length;
  }

  if (!errors.length) {
    list.innerHTML = `
      <div class="empty-state">
        No console errors captured yet. Click Test Live Error to verify it is working.
      </div>
    `;
    return;
  }

  list.innerHTML = errors.map(error => `
    <article class="log-card console-error-card">
      <div class="log-main">
        <strong>${escapeHtml(error.source || "Error")}</strong>
        <span class="log-status">
          ${escapeHtml(error.message || "Unknown error")}
        </span>
      </div>

      <div class="log-meta">
        <span>${escapeHtml(new Date(error.created_at || Date.now()).toLocaleString())}</span>
        <span>${escapeHtml(error.username || "Guest")}</span>
        <span>${escapeHtml(error.user_role || "No role")}</span>
        <span>${escapeHtml(error.device_hex || "No device")}</span>
      </div>

      <p class="muted">${escapeHtml(error.page_url || "Unknown page")}</p>

      ${error.stack_trace ? `
        <details class="console-details">
          <summary>STACK / DETAILS</summary>
          <pre>${escapeHtml(error.stack_trace)}</pre>
        </details>
      ` : ""}
    </article>
  `).join("");
}

async function saveRemote(error) {
  const { id, ...payload } = error;

  const response = await fetch(
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

  saveLocalError(makeLocalError(
    "staff.console.supabase",
    text,
    stack
  ));
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
    const text =
      `Supabase console load failed. Details: ${error.message}`;

    if (message) {
      message.textContent = text;
    }

    recordSupabaseFailure(text, error.stack || "");
  }

  readLocalErrors();
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
    message.textContent = "Test error added locally. Saving to Supabase...";
  }

  try {
    await saveRemote(error);

    if (message) {
      message.textContent =
        "Test error added locally and saved to Supabase.";
    }
  } catch (saveError) {
    const text =
      `Test error saved locally, but Supabase rejected it. Details: ${saveError.message}`;

    if (message) {
      message.textContent = text;
    }

    recordSupabaseFailure(text, saveError.stack || "");
  }

  await loadRemoteErrors();
}

function installNavigation() {
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
      if (
        button.dataset.panel === "systemConsole" &&
        !canUseConsole()
      ) {
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

function start() {
  if (!list) return;

  applyConsoleAccess();
  installNavigation();
  readLocalErrors();
  render();

  if (message) {
    message.textContent =
      "Live console started. Waiting for page errors...";
  }

  testButton?.addEventListener("click", testLiveConsole);

  window.addEventListener("blackVelvetConsoleError", event => {
    if (!event.detail || !canUseConsole()) return;

    localErrors.unshift(event.detail);
    render();
  });

  window.addEventListener("storage", event => {
    if (event.key === "blackVelvetProfile") {
      applyConsoleAccess();
      readLocalErrors();
      render();
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
