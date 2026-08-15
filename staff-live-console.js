const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const STORAGE_KEY = "blackVelvetLocalConsoleErrors";

const list = document.getElementById("consoleList");
const count = document.getElementById("consoleCount");
const message = document.getElementById("consoleMessage");
const clearButton = document.getElementById("clearConsoleButton");
const testButton = document.getElementById("testConsoleButton");

let remoteErrors = [];
let localErrors = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
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
      const key = `${error.created_at}-${error.source}-${error.message}-${error.page_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 200);
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/system_errors?select=*&order=created_at.desc&limit=150`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }

    remoteErrors = await response.json();
    if (message) message.textContent = "Live console connected.";
  } catch (error) {
    if (message) message.textContent = `Live console using local backup. Supabase load failed: ${error.message}`;
  }

  readLocal();
  render();
}

async function clearConsole() {
  localStorage.removeItem(STORAGE_KEY);
  localErrors = [];

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/system_errors?id=not.is.null`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    remoteErrors = [];
    if (message) message.textContent = "Console cleared.";
  } catch (error) {
    if (message) message.textContent = `Local console cleared. Supabase clear failed: ${error.message}`;
  }

  render();
}

if (list) {
  readLocal();
  render();
  loadRemote();
  setInterval(loadRemote, 2500);

  window.addEventListener("blackVelvetConsoleError", event => {
    localErrors.unshift(event.detail);
    render();
  });

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("black-velvet-console-errors");
    channel.addEventListener("message", event => {
      localErrors.unshift(event.data);
      render();
    });
  }

  clearButton?.addEventListener("click", clearConsole);

  testButton?.addEventListener("click", () => {
    if (window.BlackVelvetTestConsoleError) {
      window.BlackVelvetTestConsoleError();
    } else {
      console.error(new Error("Black Velvet live console test error"));
    }
  });
}
