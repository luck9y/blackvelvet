const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";
const CHANNEL_NAME = "black-velvet-console-errors";

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");

const allowedRoles = ["owner", "manager"];
const permanentOwners = ["imtherealluckyy", "suoaz"];

let remoteErrors = [];
let localErrors = [];
let started = false;
let lastSupabaseFailureMessage = "";
let lastSupabaseFailureTime = 0;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function safeJson(value) {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
}

function getProfile() {
  return safeJson(localStorage.getItem("blackVelvetProfile"));
}

function flattenStorageValues(value, results = []) {
  if (!value || results.length > 80) return results;

  if (Array.isArray(value)) {
    value.forEach(item => flattenStorageValues(item, results));
    return results;
  }

  if (typeof value === "object") {
    results.push(value);
    Object.values(value).forEach(item => {
      if (typeof item === "object") flattenStorageValues(item, results);
    });
  }

  return results;
}

function getStoredObjects() {
  const objects = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const value = safeJson(localStorage.getItem(key));

    if (value && typeof value === "object") {
      flattenStorageValues(value, objects);
    }
  }

  const profile = getProfile();
  if (profile) objects.unshift(profile);

  return objects;
}

function getCurrentUsername() {
  const signedInText = document.getElementById("signedInAs")?.textContent || "";
  const objects = getStoredObjects();

  const names = objects
    .map(item => item?.username || item?.staffUsername || item?.name || item?.displayName || item?.discordTag)
    .filter(Boolean);

  names.push(signedInText);

  return names.map(name => String(name).toLowerCase()).join(" ");
}

function getCurrentRole() {
  const signedInText = document.getElementById("signedInAs")?.textContent || "";
  const objects = getStoredObjects();

  const roles = objects
    .map(item => item?.staffRank || item?.role || item?.rank || item?.accountType || item?.type)
    .filter(Boolean);

  roles.push(signedInText);

  return roles.map(role => String(role).toLowerCase()).join(" ");
}

function canUseConsole() {
  const username = getCurrentUsername();
  const role = getCurrentRole();

  return permanentOwners.some(owner => username.includes(owner)) ||
    allowedRoles.some(allowedRole => role.includes(allowedRole));
}

function activatePanel(panelId) {
  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.toggle("active-panel", panel.id === panelId);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.panel === panelId);
  });
}

function applyConsoleAccess() {
  const allowed = canUseConsole();

  document.querySelectorAll(".manager-owner-only").forEach(element => {
    element.classList.toggle("hidden", !allowed);
    element.hidden = false;
    if (allowed) element.style.display = "";
  });

  const consoleButton = document.querySelector('[data-panel="systemConsole"]');
  const consolePanel = document.getElementById("systemConsole");

  if (allowed) {
    consoleButton?.classList.remove("hidden");
    consolePanel?.classList.remove("hidden");
  }

  if (!allowed && consolePanel?.classList.contains("active-panel")) {
    activatePanel("staffGuide");
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
    username: profile?.username || profile?.staffUsername || null,
    user_role: profile?.staffRank || profile?.role || profile?.rank || null,
    device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
    browser: navigator.userAgent
  };
}

function writeLocal(payload) {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    current.unshift(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 500)));
  } catch {}

  localErrors.unshift(payload);
  render();

  try {
    window.dispatchEvent(new CustomEvent("blackVelvetConsoleError", { detail: payload }));
  } catch {}
}

async function saveRemote(payload) {
  const { id, ...remotePayload } = payload;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/system_errors`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(remotePayload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}${body ? ` | ${body}` : ""}`);
  }
}

function recordSupabaseFailure(text, stack = "") {
  const now = Date.now();
  if (text === lastSupabaseFailureMessage && now - lastSupabaseFailureTime < 6000) return;

  lastSupabaseFailureMessage = text;
  lastSupabaseFailureTime = now;

  writeLocal(makeLocalError("staff.console.supabase", text, stack));
}

function readLocal() {
  try {
    localErrors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    localErrors = [];
  }
}

function uniqueErrors() {
  const seen = new Set();

  return [...localErrors, ...remoteErrors]
    .filter(error => {
      const key = `${error.id || ""}-${error.created_at}-${error.source}-${error.message}-${error.page_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 500);
}

function render() {
  if (!list) return;

  const errors = uniqueErrors();
  if (count) count.textContent = errors.length;

  if (!errors.length) {
    list.innerHTML = `<div class="empty-state">No console errors captured yet. Click Test Live Error to verify it is working.</div>`;
    window.dispatchEvent(new Event("staffSearchRefresh"));
    return;
  }

  list.innerHTML = errors.map(error => `
    <article class="log-card console-error-card">
      <div class="log-main">
        <strong>${esc(error.source || "error")}</strong>
        <span class="log-status">${esc(error.message || "Unknown error")}</span>
      </div>
      <div class="log-meta">
        <span>${esc(new Date(error.created_at || Date.now()).toLocaleString())}</span>
        <span>${esc(error.username || "Guest")}</span>
        <span>${esc(error.user_role || "No role")}</span>
        <span>${esc(error.device_hex || "No device")}</span>
      </div>
      <p class="muted">${esc(error.page_url || "Unknown page")}</p>
      ${error.stack_trace ? `
        <details class="console-details">
          <summary>STACK / DETAILS</summary>
          <pre>${esc(error.stack_trace)}</pre>
        </details>
      ` : ""}
    </article>
  `).join("");

  window.dispatchEvent(new Event("staffSearchRefresh"));
}

async function loadRemote() {
  if (!list || !applyConsoleAccess()) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/system_errors?select=*&order=created_at.desc&limit=200`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }

    remoteErrors = await response.json();
    if (message) message.textContent = "Live console connected. Errors are being saved.";
  } catch (error) {
    const text = `Supabase console load failed. Run system-errors-setup.sql again. Details: ${error.message}`;
    if (message) message.textContent = text;
    recordSupabaseFailure(text, error.stack || "");
  }

  readLocal();
  render();
}

async function testLiveConsole() {
  applyConsoleAccess();

  const payload = makeLocalError(
    "test.live.button",
    "Black Velvet live console test error. The button is working.",
    new Error("Black Velvet live console test stack").stack
  );

  writeLocal(payload);

  if (message) {
    message.textContent = "Test error added locally. Trying to save it to Supabase...";
  }

  try {
    await saveRemote(payload);
    if (message) message.textContent = "Test error added locally and saved to Supabase.";
  } catch (error) {
    const text = `Test error showed locally, but Supabase rejected the save. Details: ${error.message}`;
    if (message) message.textContent = text;
    recordSupabaseFailure(text, error.stack || "");
  }

  loadRemote();
}

function installNavigationBackup() {
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-panel]");
    if (!button) return;

    const panelId = button.dataset.panel;
    if (panelId === "systemConsole" && !canUseConsole()) return;

    activatePanel(panelId);
  }, true);
}

function startLiveConsole() {
  if (!list || started) return;
  started = true;

  installNavigationBackup();
  applyConsoleAccess();
  readLocal();
  render();

  if (message) {
    message.textContent = "Live console started. Waiting for page errors...";
  }

  loadRemote();

  setInterval(() => {
    applyConsoleAccess();
    loadRemote();
  }, 3000);

  window.addEventListener("blackVelvetConsoleError", event => {
    if (!event.detail) return;
    localErrors.unshift(event.detail);
    render();
  });

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === "blackVelvetProfile") {
      applyConsoleAccess();
      readLocal();
      render();
    }
  });

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", event => {
      if (!event.data) return;
      localErrors.unshift(event.data);
      render();
    });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("#testConsoleButton");
    if (!button) return;

    event.preventDefault();
    testLiveConsole();
  }, true);

  const portal = document.getElementById("portalView");
  if (portal) {
    new MutationObserver(() => {
      applyConsoleAccess();
      loadRemote();
    }).observe(portal, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  const signedInAs = document.getElementById("signedInAs");
  if (signedInAs) {
    new MutationObserver(() => {
      applyConsoleAccess();
      loadRemote();
    }).observe(signedInAs, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  new MutationObserver(applyConsoleAccess).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });
}

startLiveConsole();
