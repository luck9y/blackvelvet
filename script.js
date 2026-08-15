import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient("https://ptgzhljvzyceawwohmym.supabase.co", "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk");
const adminCredentials = {
  imjustluckyy: { password: "Energyball2001", role: "Owner" },
  suoaz: { password: "Lightning10", role: "Owner" },
  managergear: { password: "mygear10", role: "Manager" }
};

const leadershipRoles = ["Owner", "Admin", "Manager"];
const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const staffRankOptions = ["N/A", ...staffRoles];
const clanRanks = ["Goat", "Elite", "Legend", "Decent", "Rookie", "BVR"];
const games = ["Minecraft Java", "Minecraft Bedrock", "Valorant", "Fortnite", "Roblox", "Rocket League"];
const $ = id => document.getElementById(id);

const homeView = $("homeView");
const loginView = $("loginView");
const applicationView = $("applicationView");
const portalView = $("portalView");
const loginForm = $("loginForm");
const applicationForm = $("applicationForm");

let accessLogs = [];
let memberAccessLogs = [];
let applications = [];
let staffAccounts = [];
let clanApplications = [];
let clanMembers = [];
let accountBans = [];
let currentUser = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

async function hashPassword(password) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

function setMessage(id, text, type = "") {
  const element = $(id);
  if (!element) return;
  element.textContent = text;
  element.className = `action-message ${type}`;
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

function isBanned(username, deviceHex = deviceInfo().deviceHex) {
  const key = String(username || "").trim().toLowerCase();
  return accountBans.some(ban =>
    ban.username?.toLowerCase() === key ||
    (ban.device_hexes || []).includes(deviceHex)
  );
}

function isLeadership() {
  const username = currentUser?.username?.toLowerCase();
  return Boolean(username && (
    adminCredentials[username] ||
    leadershipRoles.includes(currentUser?.role)
  ));
}

function isStaffSession(profile) {
  if (!profile?.username) return false;
  return Boolean(
    adminCredentials[profile.username.toLowerCase()] ||
    staffRoles.includes(profile.role) ||
    (profile.isStaff && staffRoles.includes(profile.staffRank))
  );
}

function renderLeadership() {
  document.querySelectorAll(".leadership-only").forEach(element => {
    element.classList.toggle("hidden", !isLeadership());
  });
}

function getReadKey() {
  return `blackVelvetLogsRead:${currentUser?.username || "unknown"}`;
}

function logFields(entries) {
  return entries.map(([label, value]) => `
    <div class="log-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function renderLogs() {
  const lastRead = Number(localStorage.getItem(getReadKey()) || 0);
  $("logCount").textContent = accessLogs.filter(log => new Date(log.created_at).getTime() > lastRead).length;

  $("logList").innerHTML = accessLogs.length ? accessLogs.map(log => `
    <div class="log-card ${log.success ? "success" : ""}">
      <div class="log-title">
        <span>Login · ${escapeHtml(log.username)}</span>
        <span class="log-status">${log.success ? "Correct credentials" : "Incorrect credentials"}</span>
      </div>
      <div class="log-grid">${logFields([
        ["Device Hex", log.device_hex],
        ["Reason", log.reason],
        ["Device Used", log.device],
        ["Browser", log.browser],
        ["Language", log.language],
        ["Platform", log.platform],
        ["Resolution", log.resolution],
        ["Time", log.created_at]
      ])}</div>
    </div>
  `).join("") : '<div class="empty-state">No access events yet.</div>';
}

function renderMemberLogs() {
  if (!$("memberLogList")) return;

  $("memberLogCount").textContent = memberAccessLogs.filter(log => !log.success).length;
  $("memberLogList").innerHTML = memberAccessLogs.length ? memberAccessLogs.map(log => `
    <div class="log-card ${log.success ? "success" : ""}">
      <div class="log-title">
        <span>Member · ${escapeHtml(log.username)}</span>
        <span class="log-status">${log.success ? "Successful" : "Failed"}</span>
      </div>
      <div class="log-grid">${logFields([
        ["Device Hex", log.device_hex],
        ["Reason", log.reason],
        ["Device", log.device],
        ["Browser", log.browser],
        ["Language", log.language],
        ["Platform", log.platform],
        ["Resolution", log.resolution],
        ["Time", log.created_at]
      ])}</div>
    </div>
  `).join("") : '<div class="empty-state">No member access events yet.</div>';
}

function renderApplications() {
  $("applicationCount").textContent = applications.filter(app => app.status === "Pending").length;
  $("applicationList").innerHTML = applications.length ? applications.map(app => `
    <div class="log-card ${app.status === "Approved" ? "approved" : ""}">
      <div class="log-title">
        <span>${escapeHtml(app.staff_username)} · ${escapeHtml(app.role)}</span>
        <span class="log-status">${escapeHtml(app.status)}</span>
      </div>
      <div class="log-grid">${logFields([
        ["Discord Tag", app.discord_tag],
        ["Age", app.age],
        ["Timezone", app.timezone],
        ["Experience", app.experience],
        ["Availability", app.availability],
        ["Motivation", app.motivation],
        ["References", app.references_text || "None"]
      ])}</div>
      ${app.status === "Pending" ? `
        <div class="card-actions">
          <button data-application-action="approve" data-id="${app.id}">Accept</button>
          <button data-application-action="deny" data-id="${app.id}">Deny</button>
        </div>
      ` : ""}
    </div>
  `).join("") : '<div class="empty-state">No staff applications yet.</div>';
}

function renderAccounts() {
  $("staffAccountList").innerHTML = staffAccounts.length ? staffAccounts.map(account => `
    <div class="log-card approved">
      <div class="log-title">
        <span>${escapeHtml(account.username)}</span>
        <span class="log-status">${escapeHtml(account.role)}</span>
      </div>
      <div class="card-actions">
        <select data-role-account="${escapeHtml(account.username)}">
          ${staffRoles.map(role => `<option ${account.role === role ? "selected" : ""}>${role}</option>`).join("")}
        </select>
        <button data-delete-account="${escapeHtml(account.username)}">Remove account</button>
      </div>
    </div>
  `).join("") : '<div class="empty-state">No separate staff accounts yet. Staff-enabled clan members appear under Clan Members.</div>';
}

function renderClanApplications() {
  $("clanApplicationCount").textContent = clanApplications.filter(item => item.status === "Pending").length;

  $("clanApplicationList").innerHTML = clanApplications.length ? clanApplications.map(item => `
    <div class="log-card ${item.status === "Approved" ? "approved" : ""}">
      <div class="log-title">
        <span>${escapeHtml(item.username)} · ${escapeHtml(item.game || "No game")}</span>
        <span class="log-status">${escapeHtml(item.status)}</span>
      </div>
      <div class="log-grid">
        <div class="log-field"><span>Requested Rank</span><strong>${escapeHtml(item.rank)}</strong></div>
        <div class="log-field"><span>Discord</span><strong>${escapeHtml(item.discord_tag)}</strong></div>
        <div class="log-field"><span>Verification</span><strong>${item.preferred_tryout ? "Preferred tryout" : escapeHtml(item.clip_url || "BVR / none")}</strong></div>
      </div>
      ${item.status === "Pending" ? `
        <div class="card-actions">
          <button data-clan-action="approve" data-id="${item.id}">Accept</button>
          <button data-clan-action="deny" data-id="${item.id}">Deny</button>
        </div>
      ` : ""}
    </div>
  `).join("") : '<div class="empty-state">No clan member applications yet.</div>';
}

function renderClanMembers() {
  $("clanMemberList").innerHTML = clanMembers.length ? clanMembers.map(member => {
    const banned = accountBans.some(ban => ban.username?.toLowerCase() === member.username?.toLowerCase());
    const staffRank = member.staff_rank || "N/A";

    return `
      <div class="log-card ${banned ? "" : "approved"}">
        <div class="log-title">
          <span>${escapeHtml(member.username)}</span>
          <span class="log-status">
            ${escapeHtml(member.game)} · ${escapeHtml(member.rank)} ·
            Staff: ${escapeHtml(staffRank)} ·
            #${escapeHtml(member.ranking_number || "N/A")} ·
            ${banned ? "BANNED" : member.is_staff ? "STAFF ACCOUNT" : "NORMAL ACCOUNT"}
          </span>
        </div>

        <div class="card-actions">
          <label>
            Game
            <select data-clan-game="${escapeHtml(member.username)}">
              ${games.map(game => `<option ${member.game === game ? "selected" : ""}>${game}</option>`).join("")}
            </select>
          </label>

          <label>
            Rank
            <select data-clan-rank="${escapeHtml(member.username)}">
              ${clanRanks.map(rank => `<option ${member.rank === rank ? "selected" : ""}>${rank}</option>`).join("")}
            </select>
          </label>

          <label>
            Staff Rank
            <select data-staff-rank="${escapeHtml(member.username)}">
              ${staffRankOptions.map(role => `<option ${staffRank === role ? "selected" : ""}>${role}</option>`).join("")}
            </select>
          </label>

          <label>
            Account Type
            <select data-account-type="${escapeHtml(member.username)}">
              <option value="normal" ${!member.is_staff ? "selected" : ""}>Normal account</option>
              <option value="staff" ${member.is_staff ? "selected" : ""}>Staff account</option>
            </select>
          </label>

          <label>
            Ranking #
            <input
              type="number"
              min="1"
              value="${escapeHtml(member.ranking_number || "")}"
              placeholder="Ranking #"
              data-ranking-number="${escapeHtml(member.username)}"
            >
          </label>

          <button data-ban-member="${escapeHtml(member.username)}">
            ${banned ? "Unban account" : "Ban account"}
          </button>
          <button data-delete-member="${escapeHtml(member.username)}">Remove member</button>
        </div>
      </div>
    `;
  }).join("") : '<div class="empty-state">No clan members yet.</div>';
}

async function loadData() {
  const results = await Promise.all([
    supabase.from("access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("member_access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_accounts").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_member_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("clan_members").select("*").order("game").order("ranking_number"),
    supabase.from("account_bans").select("*").order("created_at", { ascending: false })
  ]);

  const failed = results.find(result => result.error);
  if (failed) throw failed.error;

  [
    accessLogs,
    memberAccessLogs,
    applications,
    staffAccounts,
    clanApplications,
    clanMembers,
    accountBans
  ] = results.map(result => result.data || []);

  renderLogs();
  renderMemberLogs();
  renderApplications();
  renderAccounts();
  renderClanApplications();
  renderClanMembers();
}

async function addAccessLog(username, success, reason) {
  const info = deviceInfo();
  await supabase.from("access_logs").insert({
    username,
    success,
    reason,
    device_hex: info.deviceHex,
    device: info.device,
    browser: info.browser,
    language: info.language,
    platform: info.platform,
    resolution: info.resolution
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
  const member = clanMembers.find(item => item.username?.trim().toLowerCase() === usernameKey && item.is_staff);
  const memberApplication = member
    ? clanApplications.find(item => item.username?.trim().toLowerCase() === usernameKey && item.status === "Approved")
    : null;

  if (isBanned(usernameKey)) {
    localStorage.removeItem("blackVelvetProfile");
    localStorage.setItem("blackVelvetBanned", "true");
    await addAccessLog(usernameInput || "Blank username", false, "Account or device is permanently banned");
    $("loginMessage").textContent = "THIS ACCOUNT OR DEVICE IS BANNED.";
    $("loginMessage").className = "login-message error";
    return;
  }

  localStorage.removeItem("blackVelvetBanned");

  const memberPasswordValid = Boolean(
    member &&
    memberApplication?.password_hash &&
    memberApplication.password_hash === await hashPassword(password)
  );

  const valid = Boolean(
    (admin && admin.password === password) ||
    (account && account.staff_password === password) ||
    memberPasswordValid
  );

  await addAccessLog(
    usernameInput || "Blank username",
    valid,
    valid ? "Correct credentials" : "Username or password was incorrect"
  );

  if (!valid) {
    $("loginMessage").textContent = "Invalid username or password.";
    $("loginMessage").className = "login-message error";
    return;
  }

  const role = admin?.role || account?.role || member?.staff_rank || "Helper";
  currentUser = {
    username: usernameKey,
    role,
    staffRank: role,
    isStaff: true,
    type: "staff"
  };

  localStorage.setItem("blackVelvetProfile", JSON.stringify(currentUser));
  $("signedInAs").textContent = `${usernameInput} · ${role}`;
  loginForm.reset();
  show(portalView);
  renderLeadership();
});

applicationForm.addEventListener("submit", async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(applicationForm));

  const { error } = await supabase.from("applications").insert({
    discord_tag: data.discordTag,
    staff_username: data.staffUsername.trim(),
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

  document.querySelectorAll(".nav-button").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.toggle("active-panel", panel.id === button.dataset.panel);
  });
});

$("applicationList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-application-action]");
  if (!button || !isLeadership()) return;

  const app = applications.find(item => String(item.id) === button.dataset.id);
  const status = button.dataset.applicationAction === "approve" ? "Approved" : "Denied";
  const { error } = await supabase.from("applications").update({ status }).eq("id", button.dataset.id);

  if (error) return showDatabaseError("applicationsMessage", "Could not update application", error);

  if (status === "Approved") {
    const { error: accountError } = await supabase.from("staff_accounts").upsert({
      username: app.staff_username,
      staff_password: app.staff_password,
      role: app.role
    }, { onConflict: "username" });

    if (accountError) return showDatabaseError("applicationsMessage", "Could not create staff account", accountError);
  }

  await loadData();
});

$("staffAccountList").addEventListener("change", async event => {
  const select = event.target.closest("select[data-role-account]");
  if (!select || !isLeadership()) return;

  const { error } = await supabase
    .from("staff_accounts")
    .update({ role: select.value })
    .eq("username", select.dataset.roleAccount);

  if (error) return showDatabaseError("accountsMessage", "Could not update staff role", error);
  await loadData();
});

$("staffAccountList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-delete-account]");
  if (!button || !isLeadership()) return;

  const { error } = await supabase
    .from("staff_accounts")
    .delete()
    .eq("username", button.dataset.deleteAccount);

  if (error) return showDatabaseError("accountsMessage", "Could not remove staff account", error);
  await loadData();
});

$("clanApplicationList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-clan-action]");
  if (!button || !isLeadership()) return;

  const application = clanApplications.find(item => String(item.id) === button.dataset.id);
  const status = button.dataset.clanAction === "approve" ? "Approved" : "Denied";

  const { error } = await supabase
    .from("clan_member_applications")
    .update({ status })
    .eq("id", application.id);

  if (error) return showDatabaseError("clanApplicationsMessage", "Could not update application", error);

  if (status === "Approved") {
    const { error: memberError } = await supabase.from("clan_members").upsert({
      username: application.username,
      discord_tag: application.discord_tag,
      avatar_url: application.avatar_url || null,
      game: application.game || "Minecraft Java",
      rank: application.rank || "BVR",
      staff_rank: "N/A",
      is_staff: false
    }, { onConflict: "username" });

    if (memberError) {
      return showDatabaseError("clanApplicationsMessage", "Member creation failed", memberError);
    }
  }

  await loadData();
});

$("clanMemberList").addEventListener("change", async event => {
  if (!isLeadership()) return;

  const gameSelect = event.target.closest("select[data-clan-game]");
  const rankSelect = event.target.closest("select[data-clan-rank]");
  const staffRankSelect = event.target.closest("select[data-staff-rank]");
  const accountTypeSelect = event.target.closest("select[data-account-type]");
  const rankInput = event.target.closest("input[data-ranking-number]");

  const username =
    gameSelect?.dataset.clanGame ||
    rankSelect?.dataset.clanRank ||
    staffRankSelect?.dataset.staffRank ||
    accountTypeSelect?.dataset.accountType ||
    rankInput?.dataset.rankingNumber;

  if (!username) return;

  const member = clanMembers.find(item => item.username === username);
  let update;

  if (gameSelect) {
    update = { game: gameSelect.value };
  } else if (rankSelect) {
    update = { rank: rankSelect.value };
  } else if (staffRankSelect) {
    update = {
      staff_rank: staffRankSelect.value,
      is_staff: staffRankSelect.value !== "N/A"
    };
  } else if (accountTypeSelect) {
    const isStaff = accountTypeSelect.value === "staff";
    update = {
      is_staff: isStaff,
      staff_rank: isStaff
        ? (member.staff_rank && member.staff_rank !== "N/A" ? member.staff_rank : "Helper")
        : "N/A"
    };
  } else {
    update = { ranking_number: Number(rankInput.value) || null };
  }

  const nextGame = update.game || member.game;
  const nextNumber = Object.hasOwn(update, "ranking_number")
    ? update.ranking_number
    : member.ranking_number;

  if (
    nextNumber &&
    clanMembers.some(item =>
      item.username !== username &&
      item.game === nextGame &&
      Number(item.ranking_number) === Number(nextNumber)
    )
  ) {
    setMessage("clanMembersMessage", `#${nextNumber} is already assigned in ${nextGame}.`, "error");
    return loadData();
  }

  const { error } = await supabase
    .from("clan_members")
    .update(update)
    .eq("username", username);

  if (error) return showDatabaseError("clanMembersMessage", "Could not update member", error);

  setMessage("clanMembersMessage", `${username} was updated.`, "success");
  await loadData();
});

$("clanMemberList").addEventListener("click", async event => {
  if (!isLeadership()) return;

  const banButton = event.target.closest("button[data-ban-member]");
  const deleteButton = event.target.closest("button[data-delete-member]");

  if (banButton) {
    const username = banButton.dataset.banMember;
    const normalizedUsername = username.trim().toLowerCase();
    const existingBan = accountBans.find(ban => ban.username?.toLowerCase() === normalizedUsername);

    if (existingBan) {
      const { error } = await supabase
        .from("account_bans")
        .delete()
        .eq("username", existingBan.username);

      if (error) return showDatabaseError("clanMembersMessage", "Could not unban account", error);
      setMessage("clanMembersMessage", `${username} has been unbanned.`, "success");
    } else {
      const { data: logs, error: logError } = await supabase
        .from("member_access_logs")
        .select("device_hex")
        .ilike("username", username);

      if (logError) return showDatabaseError("clanMembersMessage", "Could not read member devices", logError);

      const deviceHexes = [...new Set(
        (logs || []).map(log => log.device_hex).filter(Boolean)
      )];

      const { error } = await supabase.from("account_bans").insert({
        username: normalizedUsername,
        device_hexes: deviceHexes,
        banned_by: currentUser.username
      });

      if (error) return showDatabaseError("clanMembersMessage", "Could not ban account", error);
      setMessage("clanMembersMessage", `${username} and ${deviceHexes.length} known device(s) have been banned.`, "success");
    }

    await loadData();
    return;
  }

  if (deleteButton) {
    const { error } = await supabase
      .from("clan_members")
      .delete()
      .eq("username", deleteButton.dataset.deleteMember);

    if (error) return showDatabaseError("clanMembersMessage", "Could not remove member", error);
    await loadData();
  }
});

function subscribeToChanges() {
  [
    "access_logs",
    "member_access_logs",
    "applications",
    "staff_accounts",
    "clan_member_applications",
    "clan_members",
    "account_bans"
  ].forEach(table => {
    supabase
      .channel(`black-velvet-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, loadData)
      .subscribe();
  });
}

(async function start() {
  try {
    await loadData();

    const savedProfile = JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");

    if (savedProfile && isBanned(savedProfile.username)) {
      localStorage.removeItem("blackVelvetProfile");
      localStorage.setItem("blackVelvetBanned", "true");
    } else if (isStaffSession(savedProfile)) {
      localStorage.removeItem("blackVelvetBanned");
      currentUser = savedProfile;
      $("signedInAs").textContent = `${currentUser.username} · ${currentUser.role || currentUser.staffRank}`;
      show(portalView);
      renderLeadership();
    }

    subscribeToChanges();
  } catch (error) {
    $("loginMessage").textContent = `Supabase error: ${error.message || "Check your tables and policies."}`;
    $("loginMessage").className = "login-message error";
  }
})();
