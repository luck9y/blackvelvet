import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const adminCredentials = {
  imjustluckyy: { password: "Energyball2001", role: "Owner" },
  suoaz: { password: "Lightning10", role: "Owner" },
  managergear: { password: "mygear10", role: "Manager" }
};

const leadershipRoles = ["Owner", "Admin", "Manager"];
const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const clanRanks = ["Goat", "Elite", "Legend", "Decent", "Rookie", "BVR"];
const protectedOwner = "imjustluckyy";

const $ = (id) => document.getElementById(id);
const homeView = $("homeView");
const loginView = $("loginView");
const applicationView = $("applicationView");
const portalView = $("portalView");
const loginForm = $("loginForm");
const applicationForm = $("applicationForm");

let accessLogs = [];
let applications = [];
let staffAccounts = [];
let clanApplications = [];
let clanMembers = [];
let currentUser = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function setMessage(id, text, type = "") {
  const element = $(id);
  if (element) {
    element.textContent = text;
    element.className = `action-message ${type}`;
  }
}

function showDatabaseError(id, action, error) {
  console.error(action, error);
  setMessage(id, `${action}: ${error?.message || "Database error."}`, "error");
}

function show(view) {
  [homeView, loginView, applicationView, portalView]
    .forEach((item) => item.classList.add("hidden"));
  view.classList.remove("hidden");
}

function createDeviceHex() {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return `D${Array.from(bytes).map((value) =>
    value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function deviceInfo() {
  let deviceHex = localStorage.getItem("blackVelvetDeviceHex");
  if (!deviceHex) {
    deviceHex = createDeviceHex();
    localStorage.setItem("blackVelvetDeviceHex", deviceHex);
  }

  return {
    deviceHex,
    device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile device" : "Desktop device",
    browser: navigator.userAgent,
    language: navigator.language || "Unknown",
    platform: navigator.platform || "Unknown",
    resolution: `${screen.width}x${screen.height}`
  };
}

function isProtectedOwner(username) {
  return String(username || "").trim().toLowerCase() === protectedOwner;
}

function isLeadership() {
  const username = currentUser?.username?.toLowerCase();
  return Boolean(username && (
    adminCredentials[username] ||
    leadershipRoles.includes(currentUser?.role)
  ));
}

function renderLeadership() {
  document.querySelectorAll(".leadership-only").forEach((element) => {
    element.classList.toggle("hidden", !isLeadership());
  });
}

function getReadKey() {
  return `blackVelvetLogsRead:${currentUser?.username || "unknown"}`;
}

function getLogTime(log) {
  return log.created_at ? new Date(log.created_at).getTime() : 0;
}

function renderLogs() {
  const lastRead = Number(localStorage.getItem(getReadKey()) || 0);
  const unread = accessLogs.filter((log) => getLogTime(log) > lastRead);
  $("logCount").textContent = unread.length;

  $("logList").innerHTML = accessLogs.length ? accessLogs.map((log) => `
    <div class="log-card ${log.success ? "success" : ""}">
      <div class="log-title">
        <span>Login · ${escapeHtml(log.username || log.user)}</span>
        <span class="log-status">${log.success ? "Correct credentials" : "Incorrect credentials"}</span>
      </div>
      <div class="log-grid">
        ${[
          ["Device Hex", log.device_hex],
          ["Reason", log.reason],
          ["Device Used", log.device],
          ["Browser", log.browser],
          ["Language", log.language],
          ["Platform", log.platform],
          ["Resolution", log.resolution],
          ["Time", log.created_at ? new Date(log.created_at).toString() : ""]
        ].map(([label, value]) => `
          <div class="log-field">
            <span>${label}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("") : '<div class="empty-state">No access events yet.</div>';
}

function markLogsRead() {
  const newest = accessLogs.reduce(
    (latest, log) => Math.max(latest, getLogTime(log)), Date.now()
  );
  localStorage.setItem(getReadKey(), String(newest));
  renderLogs();
  setMessage("logsMessage", "Logs marked as read.", "success");
}

function renderApplications() {
  $("applicationCount").textContent =
    applications.filter((app) => app.status === "Pending").length;

  $("applicationList").innerHTML = applications.length ? applications.map((app) => `
    <div class="log-card ${app.status === "Approved" ? "approved" : ""}">
      <div class="log-title">
        <span>${escapeHtml(app.staff_username)} · ${escapeHtml(app.role)}</span>
        <span class="log-status">${escapeHtml(app.status)}</span>
      </div>
      <div class="log-grid">
        ${[
          ["Discord Tag", app.discord_tag],
          ["Age", app.age],
          ["Timezone", app.timezone],
          ["Experience", app.experience],
          ["Availability", app.availability],
          ["Motivation", app.motivation],
          ["References", app.references_text || "None"],
          ["Submitted", app.created_at]
        ].map(([label, value]) => `
          <div class="log-field"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>
        `).join("")}
      </div>
      ${app.status === "Pending" ? `
        <div class="card-actions">
          <button type="button" data-application-action="approve" data-id="${escapeHtml(app.id)}">Accept</button>
          <button type="button" data-application-action="deny" data-id="${escapeHtml(app.id)}">Deny</button>
        </div>
      ` : ""}
    </div>
  `).join("") : '<div class="empty-state">No staff applications yet.</div>';
}

function renderAccounts() {
  $("staffAccountList").innerHTML = staffAccounts.length ? staffAccounts.map((account) => {
    const username = account.username || "";
    const protectedAccount = isProtectedOwner(username);

    return `
      <div class="log-card approved">
        <div class="log-title">
          <span>${escapeHtml(username)}</span>
          <span class="log-status">${escapeHtml(account.role)}</span>
        </div>
        <div class="log-grid">
          <div class="log-field">
            <span>Created</span>
            <strong>${escapeHtml(account.created_at)}</strong>
          </div>
          <div class="log-field">
            <span>Rank</span>
            ${protectedAccount ? "<strong>Owner · Protected</strong>" : `
              <select data-role-account="${escapeHtml(username)}">
                ${staffRoles.map((role) => `
                  <option value="${role}" ${account.role === role ? "selected" : ""}>${role}</option>
                `).join("")}
              </select>
            `}
          </div>
        </div>
        ${protectedAccount
          ? '<p class="muted">This owner account cannot be changed or removed.</p>'
          : `<div class="card-actions">
              <button type="button" data-delete-account="${escapeHtml(username)}">Remove account</button>
            </div>`}
      </div>
    `;
  }).join("") : '<div class="empty-state">No approved staff accounts yet.</div>';
}

function renderClanApplications() {
  $("clanApplicationCount").textContent =
    clanApplications.filter((item) => item.status === "Pending").length;

  $("clanApplicationList").innerHTML = clanApplications.length
    ? clanApplications.map((item) => `
      <div class="log-card ${item.status === "Approved" ? "approved" : ""}">
        <div class="log-title">
          <span>${escapeHtml(item.username)} · ${escapeHtml(item.rank || "BVR")}</span>
          <span class="log-status">${escapeHtml(item.status)}</span>
        </div>
        <div class="log-grid">
          <div class="log-field"><span>Username</span><strong>${escapeHtml(item.username)}</strong></div>
          <div class="log-field"><span>Requested Rank</span><strong>${escapeHtml(item.rank || "BVR")}</strong></div>
          <div class="log-field"><span>Discord</span><strong>${escapeHtml(item.discord_tag)}</strong></div>
          <div class="log-field"><span>Submitted</span><strong>${escapeHtml(item.created_at)}</strong></div>
        </div>
        ${item.status === "Pending" ? `
          <div class="card-actions">
            <button type="button" data-clan-action="approve" data-id="${escapeHtml(item.id)}">Accept</button>
            <button type="button" data-clan-action="deny" data-id="${escapeHtml(item.id)}">Deny</button>
          </div>
        ` : ""}
      </div>
    `).join("")
    : '<div class="empty-state">No clan member applications yet.</div>';
}

function renderClanMembers() {
  $("clanMemberList").innerHTML = clanMembers.length
    ? clanMembers.map((member) => `
      <div class="log-card approved">
        <div class="log-title">
          <span>${escapeHtml(member.username)}</span>
          <span class="log-status">${escapeHtml(member.rank)}</span>
        </div>
        <div class="card-actions">
          <select data-clan-rank="${escapeHtml(member.username)}">
            ${clanRanks.map((rank) => `
              <option value="${rank}" ${member.rank === rank ? "selected" : ""}>${rank}</option>
            `).join("")}
          </select>
          <button type="button" data-delete-member="${escapeHtml(member.username)}">Remove member</button>
        </div>
      </div>
    `).join("")
    : '<div class="empty-state">No clan members yet.</div>';
}

async function loadData() {
  const results = await Promise.all([
    supabase.from("access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_accounts").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_member_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_members").select("*").order("created_at", { ascending: false })
  ]);

  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;

  [accessLogs, applications, staffAccounts, clanApplications, clanMembers] =
    results.map((result) => result.data || []);

  renderLogs();
  renderApplications();
  renderAccounts();
  renderClanApplications();
  renderClanMembers();
}

async function addAccessLog(username, success, reason) {
  const info = deviceInfo();
  const { error } = await supabase.from("access_logs").insert({
    username, success, reason,
    device_hex: info.deviceHex,
    device: info.device,
    browser: info.browser,
    language: info.language,
    platform: info.platform,
    resolution: info.resolution
  });
  if (error) console.error("Could not save access log:", error);
  await loadData();
}

$("staffLoginButton").addEventListener("click", () => show(loginView));
$("applicationButton").addEventListener("click", () => show(applicationView));
document.querySelectorAll("[data-home]").forEach((button) =>
  button.addEventListener("click", () => show(homeView))
);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const usernameInput = $("username").value.trim();
  const usernameKey = usernameInput.toLowerCase();
  const password = $("password").value;
  const admin = adminCredentials[usernameKey];
  const account = staffAccounts.find((item) =>
    item.username?.trim().toLowerCase() === usernameKey
  );

  const valid = Boolean(
    (admin && admin.password === password) ||
    (account && account.staff_password === password)
  );

  await addAccessLog(
    usernameInput || "Blank username",
    valid,
    valid ? "Correct credentials" : "Username or password was incorrect"
  );

  if (!valid) {
    $("loginMessage").textContent = "Invalid username or password.";
    $("loginMessage").className = "login-message error";
    $("password").value = "";
    return;
  }

  currentUser = {
    username: usernameKey,
    role: admin?.role || account.role
  };

  $("signedInAs").textContent = `${usernameInput} · ${currentUser.role}`;
  $("loginMessage").textContent = "";
  loginForm.reset();
  show(portalView);
  renderLeadership();
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(applicationForm));
  const username = data.staffUsername.trim();
  const usernameKey = username.toLowerCase();

  const duplicate =
    applications.some((app) => app.staff_username?.toLowerCase() === usernameKey) ||
    staffAccounts.some((account) => account.username?.toLowerCase() === usernameKey) ||
    Object.keys(adminCredentials).includes(usernameKey);

  if (duplicate) {
    $("applicationMessage").textContent = "That staff username already exists or is pending.";
    $("applicationMessage").className = "login-message error";
    return;
  }

  const { error } = await supabase.from("applications").insert({
    discord_tag: data.discordTag,
    staff_username: username,
    staff_password: data.staffPassword,
    age: Number(data.age),
    timezone: data.timezone,
    experience: data.experience,
    role: data.role,
    availability: data.availability,
    motivation: data.motivation,
    references_text: data.references || "",
    status: "Pending"
  });

  if (error) {
    $("applicationMessage").textContent = `Signup failed: ${error.message}`;
    $("applicationMessage").className = "login-message error";
    return;
  }

  applicationForm.reset();
  $("applicationMessage").textContent = "Your signup was submitted.";
  $("applicationMessage").className = "login-message success";
  await loadData();
});

$("clearApplicationButton").addEventListener("click", () => {
  applicationForm.reset();
  $("applicationMessage").textContent = "";
});

$("logoutButton").addEventListener("click", () => {
  currentUser = null;
  show(homeView);
});

$("navigation").addEventListener("click", (event) => {
  const button = event.target.closest(".nav-button");
  if (!button || button.classList.contains("hidden") || !isLeadership()) return;

  document.querySelectorAll(".nav-button").forEach((item) =>
    item.classList.toggle("active", item === button)
  );

  document.querySelectorAll(".panel").forEach((panel) =>
    panel.classList.toggle("active-panel", panel.id === button.dataset.panel)
  );

  if (button.dataset.panel === "loginLogs") {
    markLogsRead();
  }
});

$("applicationList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-application-action]");
  if (!button || !isLeadership()) return;

  const id = button.dataset.id;
  const action = button.dataset.applicationAction;
  const status = action === "approve" ? "Approved" : "Denied";

  setMessage("applicationsMessage", `${status === "Approved" ? "Accepting" : "Denying"} application...`);
  button.disabled = true;

  const { error } = await supabase.from("applications")
    .update({ status }).eq("id", id);

  if (error) {
    button.disabled = false;
    showDatabaseError("applicationsMessage", "Could not update application", error);
    return;
  }

  const app = applications.find((item) => String(item.id) === String(id));

  if (status === "Approved" && app) {
    const { error: accountError } = await supabase.from("staff_accounts").upsert({
      username: app.staff_username,
      staff_password: app.staff_password,
      role: app.role
    }, { onConflict: "username" });

    if (accountError) {
      showDatabaseError("applicationsMessage", "Account creation failed", accountError);
      return;
    }
  }

  setMessage("applicationsMessage", `Application ${status.toLowerCase()}.`, "success");
  await loadData();
});

$("staffAccountList").addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-role-account]");
  if (!select || !isLeadership()) return;

  const username = select.dataset.roleAccount;
  if (isProtectedOwner(username)) {
    setMessage("accountsMessage", "Imjustluckyy is protected.", "error");
    await loadData();
    return;
  }

  const role = select.value;
  setMessage("accountsMessage", `Changing ${username} to ${role}...`);
  select.disabled = true;

  const { error } = await supabase.from("staff_accounts")
    .update({ role }).eq("username", username);

  if (error) {
    showDatabaseError("accountsMessage", "Could not change staff rank", error);
    await loadData();
    return;
  }

  if (currentUser?.username === username.toLowerCase()) {
    currentUser.role = role;
    $("signedInAs").textContent = `${username} · ${role}`;
    renderLeadership();
  }

  setMessage("accountsMessage", `${username} is now ${role}.`, "success");
  await loadData();
});

$("staffAccountList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-delete-account]");
  if (!button || !isLeadership()) return;

  const username = button.dataset.deleteAccount;
  if (isProtectedOwner(username)) {
    setMessage("accountsMessage", "Imjustluckyy is protected.", "error");
    return;
  }

  setMessage("accountsMessage", `Removing ${username}...`);
  button.disabled = true;

  const { error } = await supabase.from("staff_accounts")
    .delete().eq("username", username);

  if (error) {
    button.disabled = false;
    showDatabaseError("accountsMessage", "Could not remove staff account", error);
    return;
  }

  setMessage("accountsMessage", `${username} removed successfully.`, "success");
  await loadData();
});

$("clanApplicationList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-clan-action]");
  if (!button || !isLeadership()) return;

  const id = button.dataset.id;
  const action = button.dataset.clanAction;
  const status = action === "approve" ? "Approved" : "Denied";

  setMessage(
    "clanApplicationsMessage",
    `${status === "Approved" ? "Accepting" : "Denying"} clan application...`
  );
  button.disabled = true;

  const { data: application, error: findError } = await supabase
    .from("clan_member_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (findError) {
    showDatabaseError("clanApplicationsMessage", "Could not find application", findError);
    return;
  }

  const { error } = await supabase
    .from("clan_member_applications")
    .update({ status })
    .eq("id", id);

  if (error) {
    showDatabaseError("clanApplicationsMessage", "Could not update application", error);
    return;
  }

  if (status === "Approved") {
    const { error: memberError } = await supabase.from("clan_members").upsert({
      username: application.username,
      rank: application.rank || "BVR",
      discord_tag: application.discord_tag
    }, { onConflict: "username" });

    if (memberError) {
      showDatabaseError("clanApplicationsMessage", "Member creation failed", memberError);
      return;
    }
  }

  setMessage("clanApplicationsMessage", `Clan application ${status.toLowerCase()}.`, "success");
  await loadData();
});

$("clanMemberList").addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-clan-rank]");
  if (!select || !isLeadership()) return;

  const username = select.dataset.clanRank;
  setMessage("clanMembersMessage", `Changing ${username} to ${select.value}...`);
  select.disabled = true;

  const { error } = await supabase.from("clan_members")
    .update({ rank: select.value }).eq("username", username);

  if (error) {
    showDatabaseError("clanMembersMessage", "Could not change clan rank", error);
    await loadData();
    return;
  }

  setMessage("clanMembersMessage", `${username} is now ${select.value}.`, "success");
  await loadData();
});

$("clanMemberList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-delete-member]");
  if (!button || !isLeadership()) return;

  const username = button.dataset.deleteMember;
  setMessage("clanMembersMessage", `Removing ${username}...`);
  button.disabled = true;

  const { error } = await supabase.from("clan_members")
    .delete().eq("username", username);

  if (error) {
    showDatabaseError("clanMembersMessage", "Could not remove clan member", error);
    return;
  }

  setMessage("clanMembersMessage", `${username} removed successfully.`, "success");
  await loadData();
});

function subscribeToChanges() {
  ["access_logs", "applications", "staff_accounts",
    "clan_member_applications", "clan_members"].forEach((table) => {
      supabase.channel(`black-velvet-${table}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table
        }, loadData)
        .subscribe();
    });
}

(async function start() {
  try {
    await loadData();
    subscribeToChanges();
  } catch (error) {
    console.error("Supabase setup error:", error);
    $("loginMessage").textContent =
      `Supabase error: ${error.message || "Check your tables and policies."}`;
    $("loginMessage").className = "login-message error";
  }
})();
