import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const staffRoles = [
  "owner",
  "admin",
  "administrator",
  "manager",
  "management",
  "president",
  "moderator",
  "mod",
  "helper",
  "staff"
];

const permanentOwners = [
  "imtherealluckyy",
  "imjustluckyy",
  "suoaz",
  "managergear",
  "gears"
];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
  } catch {
    return null;
  }
}

function canManagePasswords() {
  const profile = getProfile();
  const username = normalize(profile?.username);
  const role = normalize(profile?.role || profile?.staffRank);

  return permanentOwners.includes(username) ||
    ["owner", "admin", "administrator"].includes(role);
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

async function hashPassword(password) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );

  return Array.from(
    new Uint8Array(hash),
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
}

function isStaffLog(log) {
  const role = normalize(log.role || log.user_role || log.staff_rank);
  const type = normalize(log.account_type || log.accountType);
  const username = normalize(log.username);

  return permanentOwners.includes(username) ||
    staffRoles.includes(role) ||
    ["staff", "staff account", "owner", "admin", "manager"].includes(type) ||
    log.is_staff === true;
}

function addStyles() {
  if (document.getElementById("staff-login-tools-styles")) return;

  const style = document.createElement("style");
  style.id = "staff-login-tools-styles";
  style.textContent = `
    #loginLogs .login-event-card {
      padding: 17px;
      border: 1px solid #30363d;
      border-radius: 9px;
      background: linear-gradient(135deg, #1b1f24, #101215);
    }

    #loginLogs .login-event-card.staff-login-event {
      border-color: #469bff;
      background: linear-gradient(135deg, rgba(18,70,125,.48), #081321);
      box-shadow: 0 0 18px rgba(45,135,255,.2);
    }

    #loginLogs .login-event-card.login-failed {
      border-color: #875050;
    }

    #loginLogs .login-event-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #fff;
      font-weight: 700;
    }

    #loginLogs .staff-login-event .login-event-title,
    #loginLogs .staff-login-event .login-event-meta {
      color: #72b8ff;
    }

    #loginLogs .login-event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 13px;
      margin-top: 10px;
      color: #aab1b8;
      font: 12px Arial, sans-serif;
    }

    #passwordResetPanel .password-reset-box {
      display: grid;
      gap: 10px;
      max-width: 620px;
      padding: 22px;
      border: 1px solid #30363d;
      border-radius: 9px;
      background: #11151a;
      box-shadow: var(--shadow);
    }

    #passwordResetPanel .password-reset-box h4 {
      margin: 0;
      color: #fff;
    }

    #passwordResetPanel .password-reset-box input {
      width: 100%;
      padding: 10px;
      border: 1px solid #454d56;
      border-radius: 6px;
      color: #fff;
      background: #080a0d;
    }

    #passwordResetPanel .password-reset-box button {
      width: fit-content;
      padding: 9px 13px;
      border: 1px solid #6d7781;
      border-radius: 6px;
      color: #fff;
      background: #252b31;
      cursor: pointer;
    }

    #passwordResetPanel .password-reset-box button:hover {
      background: #353c44;
    }

    .password-reset-message {
      min-height: 18px;
      color: #8ee6a5;
      font: 13px Arial, sans-serif;
    }
  `;

  document.head.appendChild(style);
}

function localLogs() {
  try {
    return JSON.parse(
      localStorage.getItem("blackVelvetLoginAlerts") || "[]"
    );
  } catch {
    return [];
  }
}

async function loadLoginLogs() {
  const list = document.getElementById("loginLogsList");
  if (!list) return;

  let logs = localLogs();

  try {
    const { data, error } = await supabase
      .from("login_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      logs = [...data, ...logs];
    }
  } catch (error) {
    console.warn("Could not load remote login logs:", error.message);
  }

  const seen = new Set();

  logs = logs.filter(log => {
    const key = [
      log.created_at,
      log.username,
      log.event_type,
      log.success
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0)
  ).slice(0, 250);

  if (!logs.length) {
    list.innerHTML = `<div class="empty-state">No login activity recorded yet.</div>`;
    return;
  }

  list.innerHTML = logs.map(log => {
    const staff = isStaffLog(log);
    const success = log.success === true ||
      normalize(log.event_type) === "login_success";

    return `
      <article class="login-event-card ${staff ? "staff-login-event" : ""} ${success ? "" : "login-failed"}">
        <div class="login-event-title">
          <span>${escapeHtml(log.username || "Unknown user")}</span>
          <span>${success ? "SUCCESSFUL LOGIN" : "FAILED LOGIN"}</span>
        </div>
        <div class="login-event-meta">
          <span>ACCOUNT TYPE: ${escapeHtml(
            String(log.account_type || log.accountType || "member account").toUpperCase()
          )}</span>
          <span>ROLE: ${escapeHtml(
            String(log.role || log.user_role || "N/A").toUpperCase()
          )}</span>
          <span>${escapeHtml(
            new Date(log.created_at || Date.now()).toLocaleString()
          )}</span>
          ${log.failure_reason
            ? `<span>REASON: ${escapeHtml(log.failure_reason)}</span>`
            : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function resetPassword(username, password) {
  const passwordHash = await hashPassword(password);
  let updated = false;
  let lastError = null;

  for (const table of ["clan_members", "staff_accounts"]) {
    const result = await supabase
      .from(table)
      .update({ password_hash: passwordHash })
      .ilike("username", username)
      .select("username");

    if (result.error) {
      lastError = result.error;
      continue;
    }

    if (result.data?.length) updated = true;
  }

  if (!updated) {
    throw lastError || new Error("No matching account was found.");
  }
}

function addPasswordResetPanel() {
  if (!canManagePasswords()) return;
  if (document.getElementById("passwordResetPanel")) return;

  const nav = document.querySelector(".staff-nav");
  const main = document.querySelector(".staff-main");

  if (!nav || !main) return;

  const navButton = document.createElement("button");
  navButton.className = "nav-button";
  navButton.dataset.panel = "passwordResetPanel";
  navButton.type = "button";
  navButton.innerHTML = "<span>Password Reset</span>";
  nav.appendChild(navButton);

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "passwordResetPanel";
  panel.innerHTML = `
    <div class="panel-heading">
      <div>
        <h3>Password Reset</h3>
        <p>Reset a member or staff account password when needed.</p>
      </div>
    </div>

    <form class="password-reset-box" id="passwordResetBox">
      <h4>ADMIN PASSWORD RESET</h4>
      <span class="muted">
        Set a new password for a member or staff account. The password is saved
        as a SHA-256 hash and is never displayed in login logs.
      </span>

      <input
        name="resetUsername"
        placeholder="Username"
        autocomplete="off"
        required
      >

      <input
        name="resetPassword"
        type="password"
        placeholder="New password"
        minlength="6"
        required
      >

      <button type="submit">RESET PASSWORD</button>
      <span class="password-reset-message" id="passwordResetMessage"></span>
    </form>
  `;

  main.appendChild(panel);

  document.getElementById("passwordResetBox").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const username = String(form.resetUsername.value || "").trim();
    const password = String(form.resetPassword.value || "");
    const status = document.getElementById("passwordResetMessage");

    if (!username || password.length < 6) {
      status.textContent = "Enter a username and a password of at least 6 characters.";
      status.style.color = "#e68e8e";
      return;
    }

    status.textContent = "Saving password...";
    status.style.color = "#aab1b8";

    try {
      await resetPassword(username, password);
      status.textContent = `${username}'s password was reset successfully.`;
      status.style.color = "#8ee6a5";
      form.reset();
    } catch (error) {
      status.textContent = `Reset failed: ${error.message}`;
      status.style.color = "#e68e8e";
    }
  });
}

function start() {
  addStyles();
  addPasswordResetPanel();
  loadLoginLogs();

  window.addEventListener("storage", event => {
    if (event.key === "blackVelvetLoginAlerts") {
      loadLoginLogs();
    }
  });

  setInterval(loadLoginLogs, 5000);
}

start();
