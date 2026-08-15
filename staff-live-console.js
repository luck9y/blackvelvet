const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";
const CHANNEL_NAME = "black-velvet-console-errors";

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const testButton = document.getElementById("testConsoleButton");

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

function makeLocalError(source, errorMessage, stack = "") {
  let profile = null;

  try {
    profile = JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
  } catch {}

  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    source,
    message: String(errorMessage || "Unknown error"),
    stack_trace: stack || null,
    page_url: location.href,
    username: profile?.username || null,
    user_role: profile?.staffRank || profile?.role || null,
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
  if (!list) return;

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

function startLiveConsole() {
  if (!list || started) return;
  started = true;

  readLocal();
  render();

  if (message) {
    message.textContent = "Live console started. Waiting for page errors...";
  }

  loadRemote();
  setInterval(loadRemote, 4000);

  window.addEventListener("blackVelvetConsoleError", event => {
    if (!event.detail) return;
    localErrors.unshift(event.detail);
    render();
  });

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
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
}

startLiveConsole();
