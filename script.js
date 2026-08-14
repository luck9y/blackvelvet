import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient("https://ptgzhljvzyceawwohmym.supabase.co", "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk");
const adminCredentials = {
  imjustluckyy: { password: "Energyball2001", role: "Owner" },
  suoaz: { password: "Lightning10", role: "Owner" },
  managergear: { password: "mygear10", role: "Manager" }
};
const leadershipRoles = ["Owner", "Admin", "Manager"];
const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const clanRanks = ["Goat", "Elite", "Legend", "Decent", "Rookie", "BVR"];
const games = ["Minecraft Java", "Minecraft Bedrock", "Valorant", "Fortnite", "Roblox", "Rocket League"];
const $ = id => document.getElementById(id);

const homeView = $("homeView");
const loginView = $("loginView");
const applicationView = $("applicationView");
const portalView = $("portalView");
const loginForm = $("loginForm");
const applicationForm = $("applicationForm");

let accessLogs = [], applications = [], staffAccounts = [], clanApplications = [], clanMembers = [];
let currentUser = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
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
  [homeView, loginView, applicationView, portalView].forEach(item => item?.classList.add("hidden"));
  view?.classList.remove("hidden");
}

function createDeviceHex() {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return `D${Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
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

function isLeadership() {
  const username = currentUser?.username?.toLowerCase();
  return Boolean(username && (adminCredentials[username] || leadershipRoles.includes(currentUser?.role)));
}

function isStaffSession(profile) {
  return Boolean(profile?.username && (adminCredentials[profile.username.toLowerCase()] || staffRoles.includes(profile.role)));
}

function renderLeadership() {
  document.querySelectorAll(".leadership-only").forEach(element => {
    element.classList.toggle("hidden", !isLeadership());
  });
}

function getReadKey() {
  return `blackVelvetLogsRead:${currentUser?.username || "unknown"}`;
}

function renderLogs() {
  const lastRead = Number(localStorage.getItem(getReadKey()) || 0);
  $("logCount").textContent = accessLogs.filter(log => new Date(log.created_at).getTime() > lastRead).length;
  $("logList").innerHTML = accessLogs.length ? accessLogs.map(log => `
    <div class="log-card ${log.success ? "success" : ""}">
      <div class="log-title"><span>Login · ${escapeHtml(log.username)}</span><span class="log-status">${log.success ? "Correct credentials" : "Incorrect credentials"}</span></div>
      <div class="log-grid">${[["Device Hex", log.device_hex], ["Reason", log.reason], ["Device Used", log.device], ["Browser", log.browser], ["Language", log.language], ["Platform", log.platform], ["Resolution", log.resolution], ["Time", log.created_at]].map(([label, value]) => `<div class="log-field"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
    </div>`).join("") : '<div class="empty-state">No access events yet.</div>';
}

function renderApplications() {
  $("applicationCount").textContent = applications.filter(app => app.status === "Pending").length;
  $("applicationList").innerHTML = applications.length ? applications.map(app => `
    <div class="log-card ${app.status === "Approved" ? "approved" : ""}">
      <div class="log-title"><span>${escapeHtml(app.staff_username)} · ${escapeHtml(app.role)}</span><span class="log-status">${escapeHtml(app.status)}</span></div>
      <div class="log-grid">${[["Discord Tag", app.discord_tag], ["Age", app.age], ["Timezone", app.timezone], ["Experience", app.experience], ["Availability", app.availability], ["Motivation", app.motivation], ["References", app.references_text || "None"]].map(([label, value]) => `<div class="log-field"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
      ${app.status === "Pending" ? `<div class="card-actions"><button data-application-action="approve" data-id="${app.id}">Accept</button><button data-application-action="deny" data-id="${app.id}">Deny</button></div>` : ""}
    </div>`).join("") : '<div class="empty-state">No staff applications yet.</div>';
}

function renderAccounts() {
  $("staffAccountList").innerHTML = staffAccounts.length ? staffAccounts.map(account => `
    <div class="log-card approved">
      <div class="log-title"><span>${escapeHtml(account.username)}</span><span class="log-status">${escapeHtml(account.role)}</span></div>
      <div class="card-actions">
        <select data-role-account="${escapeHtml(account.username)}">${staffRoles.map(role => `<option ${account.role === role ? "selected" : ""}>${role}</option>`).join("")}</select>
        <button data-delete-account="${escapeHtml(account.username)}">Remove account</button>
      </div>
    </div>`).join("") : '<div class="empty-state">No approved staff accounts yet.</div>';
}

function renderClanApplications() {
  $("clanApplicationCount").textContent = clanApplications.filter(item => item.status === "Pending").length;
  $("clanApplicationList").innerHTML = clanApplications.length ? clanApplications.map(item => `
    <div class="log-card ${item.status === "Approved" ? "approved" : ""}">
      <div class="log-title"><span>${escapeHtml(item.username)} · ${escapeHtml(item.game || "No game")}</span><span class="log-status">${escapeHtml(item.status)}</span></div>
      <div class="log-grid">
        <div class="log-field"><span>Requested Rank</span><strong>${escapeHtml(item.rank)}</strong></div>
        <div class="log-field"><span>Discord</span><strong>${escapeHtml(item.discord_tag)}</strong></div>
        <div class="log-field"><span>Verification</span><strong>${item.preferred_tryout ? "Preferred tryout" : escapeHtml(item.clip_url || "BVR / none")}</strong></div>
      </div>
      ${item.status === "Pending" ? `<div class="card-actions"><button data-clan-action="approve" data-id="${item.id}">Accept</button><button data-clan-action="deny" data-id="${item.id}">Deny</button></div>` : ""}
    </div>`).join("") : '<div class="empty-state">No clan member applications yet.</div>';
}

function renderClanMembers() {
  $("clanMemberList").innerHTML = clanMembers.length ? clanMembers.map(member => `
    <div class="log-card approved">
      <div class="log-title"><span>${escapeHtml(member.username)}</span><span class="log-status">${escapeHtml(member.game)} · ${escapeHtml(member.rank)} · #${escapeHtml(member.ranking_number || "N/A")}</span></div>
      <div class="card-actions">
        <select data-clan-game="${escapeHtml(member.username)}">${games.map(game => `<option ${member.game === game ? "selected" : ""}>${game}</option>`).join("")}</select>
        <select data-clan-rank="${escapeHtml(member.username)}">${clanRanks.map(rank => `<option ${member.rank === rank ? "selected" : ""}>${rank}</option>`).join("")}</select>
        <input type="number" min="1" value="${escapeHtml(member.ranking_number || "")}" placeholder="Ranking #" data-ranking-number="${escapeHtml(member.username)}">
        <button data-delete-member="${escapeHtml(member.username)}">Remove member</button>
      </div>
    </div>`).join("") : '<div class="empty-state">No clan members yet.</div>';
}

async function loadData() {
  const results = await Promise.all([
    supabase.from("access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_accounts").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_member_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_members").select("*").order("game").order("ranking_number")
  ]);
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  [accessLogs, applications, staffAccounts, clanApplications, clanMembers] = results.map(result => result.data || []);
  renderLogs();
  renderApplications();
  renderAccounts();
  renderClanApplications();
  renderClanMembers();
}

async function addAccessLog(username, success, reason) {
  const info = deviceInfo();
  await supabase.from("access_logs").insert({
    username, success, reason, device_hex: info.deviceHex, device: info.device,
    browser: info.browser, language: info.language, platform: info.platform, resolution: info.resolution
  });
  await loadData();
}

$("staffLoginButton").addEventListener("click", () => show(loginView));
$("applicationButton").addEventListener("click", () => show(applicationView));
document.querySelectorAll("[data-home]").forEach(button => button.addEventListener("click", () => show(homeView)));

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const usernameInput = $("username").value.trim();
  const usernameKey = usernameInput.toLowerCase();
  const password = $("password").value;
  const admin = adminCredentials[usernameKey];
  const account = staffAccounts.find(item => item.username?.trim().toLowerCase() === usernameKey);
  const valid = Boolean((admin && admin.password === password) || (account && account.staff_password === password));

  await addAccessLog(usernameInput || "Blank username", valid, valid ? "Correct credentials" : "Username or password was incorrect");
  if (!valid) {
    $("loginMessage").textContent = "Invalid username or password.";
    $("loginMessage").className = "login-message error";
    return;
  }

  currentUser = { username: usernameKey, role: admin?.role || account.role, type: "staff" };
  localStorage.setItem("blackVelvetProfile", JSON.stringify(currentUser));
  $("signedInAs").textContent = `${usernameInput} · ${currentUser.role}`;
  loginForm.reset();
  show(portalView);
  renderLeadership();
});

applicationForm.addEventListener("submit", async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(applicationForm));
  const { error } = await supabase.from("applications").insert({
    discord_tag: data.discordTag, staff_username: data.staffUsername.trim(), staff_password: data.staffPassword,
    age: Number(data.age), timezone: data.timezone, experience: data.experience, role: data.role,
    availability: data.availability, motivation: data.motivation, references_text: data.references || "", status: "Pending"
  });
  if (error) return showDatabaseError("applicationMessage", "Signup failed", error);
  applicationForm.reset();
  $("applicationMessage").textContent = "Your signup was submitted.";
  await loadData();
});

$("clearApplicationButton").addEventListener("click", () => applicationForm.reset());
$("logoutButton").addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("blackVelvetProfile");
  show(homeView);
});

$("navigation").addEventListener("click", event => {
  const button = event.target.closest(".nav-button");
  if (!button || button.classList.contains("hidden")) return;
  document.querySelectorAll(".nav-button").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".panel").forEach(panel => panel.classList.toggle("active-panel", panel.id === button.dataset.panel));
});

$("applicationList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-application-action]");
  if (!button || !isLeadership()) return;
  const app = applications.find(item => String(item.id) === button.dataset.id);
  const status = button.dataset.applicationAction === "approve" ? "Approved" : "Denied";
  const { error } = await supabase.from("applications").update({ status }).eq("id", button.dataset.id);
  if (error) return showDatabaseError("applicationsMessage", "Could not update application", error);
  if (status === "Approved") {
    await supabase.from("staff_accounts").upsert({
      username: app.staff_username, staff_password: app.staff_password, role: app.role
    }, { onConflict: "username" });
  }
  await loadData();
});

$("clanApplicationList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-clan-action]");
  if (!button || !isLeadership()) return;
  const application = clanApplications.find(item => String(item.id) === button.dataset.id);
  const status = button.dataset.clanAction === "approve" ? "Approved" : "Denied";
  const { error } = await supabase.from("clan_member_applications").update({ status }).eq("id", application.id);
  if (error) return showDatabaseError("clanApplicationsMessage", "Could not update application", error);

  if (status === "Approved") {
    const { error: memberError } = await supabase.from("clan_members").upsert({
      username: application.username,
      discord_tag: application.discord_tag,
      avatar_url: application.avatar_url || null,
      game: application.game || "Minecraft Java",
      rank: application.rank || "BVR"
    }, { onConflict: "username" });
    if (memberError) return showDatabaseError("clanApplicationsMessage", "Member creation failed", memberError);
  }
  await loadData();
});

$("clanMemberList").addEventListener("change", async event => {
  if (!isLeadership()) return;
  const gameSelect = event.target.closest("select[data-clan-game]");
  const rankSelect = event.target.closest("select[data-clan-rank]");
  const rankInput = event.target.closest("input[data-ranking-number]");
  const username = gameSelect?.dataset.clanGame || rankSelect?.dataset.clanRank || rankInput?.dataset.rankingNumber;
  if (!username) return;

  const member = clanMembers.find(item => item.username === username);
  const update = gameSelect ? { game: gameSelect.value } : rankSelect ? { rank: rankSelect.value } : { ranking_number: Number(rankInput.value) || null };
  const nextGame = update.game || member.game;
  const nextNumber = update.ranking_number ?? member.ranking_number;

  if (nextNumber && clanMembers.some(item => item.username !== username && item.game === nextGame && Number(item.ranking_number) === Number(nextNumber))) {
    setMessage("clanMembersMessage", `#${nextNumber} is already assigned in ${nextGame}.`, "error");
    return loadData();
  }

  const { error } = await supabase.from("clan_members").update(update).eq("username", username);
  if (error) return showDatabaseError("clanMembersMessage", "Could not update member", error);
  await loadData();
});

$("clanMemberList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-delete-member]");
  if (!button || !isLeadership()) return;
  const { error } = await supabase.from("clan_members").delete().eq("username", button.dataset.deleteMember);
  if (error) return showDatabaseError("clanMembersMessage", "Could not remove member", error);
  await loadData();
});

function subscribeToChanges() {
  ["access_logs", "applications", "staff_accounts", "clan_member_applications", "clan_members"].forEach(table => {
    supabase.channel(`black-velvet-${table}`).on("postgres_changes", { event: "*", schema: "public", table }, loadData).subscribe();
  });
}

(async function start() {
  try {
    await loadData();
    const savedProfile = JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");

    if (isStaffSession(savedProfile)) {
      currentUser = savedProfile;
      $("signedInAs").textContent = `${currentUser.username} · ${currentUser.role}`;
      show(portalView);
      renderLeadership();
    }

    subscribeToChanges();
  } catch (error) {
    $("loginMessage").textContent = `Supabase error: ${error.message || "Check your tables and policies."}`;
    $("loginMessage").className = "login-message error";
  }
})();
