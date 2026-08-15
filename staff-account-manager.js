import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const leadershipRoles = ["Owner", "Admin", "Manager"];
const permanentOwners = ["imjustluckyy", "suoaz"];
const list = document.getElementById("staffAccountList");
const message = document.getElementById("accountsMessage");

let staffAccounts = [];
let clanMembers = [];
let rendering = false;
let refreshTimer = null;

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

function canManageStaff() {
  const profile = getProfile();
  const username = String(profile?.username || "").toLowerCase();
  const role = profile?.role || profile?.staffRank || "";

  return permanentOwners.includes(username) || leadershipRoles.includes(role);
}

function setMessage(text, type = "") {
  if (!message) return;

  message.textContent = text;
  message.className = `action-message ${type}`;
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

function getDirectory() {
  const accounts = new Map();

  staffAccounts.forEach(account => {
    const key = String(account.username || "").trim().toLowerCase();

    if (!key) return;

    accounts.set(key, {
      key,
      username: account.username,
      role: account.role || "Helper",
      staffAccount: account,
      member: null
    });
  });

  clanMembers
    .filter(member => member.is_staff)
    .forEach(member => {
      const key = String(member.username || "").trim().toLowerCase();

      if (!key) return;

      const existing = accounts.get(key);

      accounts.set(key, {
        key,
        username: member.username,
        role: member.staff_rank && member.staff_rank !== "N/A"
          ? member.staff_rank
          : existing?.role || "Helper",
        staffAccount: existing?.staffAccount || null,
        member
      });
    });

  return [...accounts.values()].sort((first, second) =>
    first.username.localeCompare(second.username)
  );
}

function renderDirectory() {
  if (!list || rendering) return;

  rendering = true;
  const directory = getDirectory();

  list.innerHTML = `
    <div data-staff-directory-root style="display:contents">
      ${directory.length ? directory.map(account => `
        <article class="log-card approved" data-staff-directory-card>
          <div class="log-title">
            <span>
              ${escapeHtml(account.username)}
              <span
                title="Verified Black Velvet Staff"
                aria-label="Verified staff"
                style="color:#8fd3ff;margin-left:6px"
              >✓</span>
            </span>

            <span class="log-status">
              ${escapeHtml(account.role)} ·
              ${account.member ? "CLAN STAFF" : "STAFF ACCOUNT"}
            </span>
          </div>

          <div class="log-grid">
            <div class="log-field">
              <span>Account Source</span>
              <strong>
                ${account.member && account.staffAccount
                  ? "Clan and staff login"
                  : account.member
                    ? "Clan account"
                    : "Standalone staff account"}
              </strong>
            </div>

            <div class="log-field">
              <span>Clan Rank</span>
              <strong>${escapeHtml(account.member?.rank || "N/A")}</strong>
            </div>

            <div class="log-field">
              <span>Game</span>
              <strong>${escapeHtml(account.member?.game || "N/A")}</strong>
            </div>

            <div class="log-field">
              <span>Staff Verification</span>
              <strong>Verified ✓</strong>
            </div>
          </div>

          <div class="card-actions">
            <label>
              Staff Rank
              <select
                data-directory-role="${escapeHtml(account.key)}"
                aria-label="Staff rank for ${escapeHtml(account.username)}"
              >
                ${staffRoles.map(role => `
                  <option value="${role}" ${account.role === role ? "selected" : ""}>
                    ${role}
                  </option>
                `).join("")}
              </select>
            </label>

            <button
              type="button"
              data-set-member="${escapeHtml(account.key)}"
            >
              Set Member
            </button>

            <button
              type="button"
              data-remove-directory-account="${escapeHtml(account.key)}"
            >
              Remove Account
            </button>
          </div>
        </article>
      `).join("") : `
        <div class="empty-state">No staff accounts yet.</div>
      `}
    </div>
  `;

  rendering = false;
}

async function loadDirectory() {
  if (!list || !canManageStaff()) return;

  const [staffResult, memberResult] = await Promise.all([
    supabase
      .from("staff_accounts")
      .select("*")
      .order("username", { ascending: true }),
    supabase
      .from("clan_members")
      .select("*")
      .order("username", { ascending: true })
  ]);

  const error = staffResult.error || memberResult.error;

  if (error) {
    setMessage(`Could not load staff accounts: ${error.message}`, "error");
    return;
  }

  staffAccounts = staffResult.data || [];
  clanMembers = memberResult.data || [];
  renderDirectory();
}

function scheduleRender() {
  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(() => {
    if (
      list &&
      canManageStaff() &&
      !list.querySelector("[data-staff-directory-root]")
    ) {
      renderDirectory();
    }
  }, 0);
}

async function updateOwnSession(username, role) {
  const profile = getProfile();

  if (
    !profile ||
    String(profile.username || "").toLowerCase() !== username.toLowerCase()
  ) {
    return;
  }

  profile.role = role;
  profile.staffRank = role;
  profile.isStaff = true;
  localStorage.setItem("blackVelvetProfile", JSON.stringify(profile));

  const signedInAs = document.getElementById("signedInAs");

  if (signedInAs) {
    signedInAs.textContent = `${profile.username} · ${role}`;
  }
}

async function changeStaffRank(account, role) {
  if (!staffRoles.includes(role)) return;

  const operations = [];

  if (account.staffAccount) {
    operations.push(
      supabase
        .from("staff_accounts")
        .update({ role })
        .eq("username", account.staffAccount.username)
    );
  }

  if (account.member) {
    operations.push(
      supabase
        .from("clan_members")
        .update({
          is_staff: true,
          staff_rank: role
        })
        .eq("id", account.member.id)
    );
  }

  const results = await Promise.all(operations);
  const failed = results.find(result => result.error);

  if (failed) {
    throw failed.error;
  }

  await updateOwnSession(account.username, role);
}

async function ensureNormalMemberAccount(account) {
  if (account.member) {
    const { error } = await supabase
      .from("clan_members")
      .update({
        is_staff: false,
        staff_rank: "N/A"
      })
      .eq("id", account.member.id);

    if (error) throw error;
    return;
  }

  if (!account.staffAccount) {
    throw new Error("The staff account could not be found.");
  }

  const username = account.staffAccount.username;
  const password = account.staffAccount.staff_password;

  if (!password) {
    throw new Error("This staff account does not have a reusable password.");
  }

  const { data:applications, error:applicationReadError } = await supabase
    .from("clan_member_applications")
    .select("*")
    .ilike("username", username)
    .order("created_at", { ascending: false })
    .limit(1);

  if (applicationReadError) throw applicationReadError;

  const application = applications?.[0];
  const passwordHash = await hashPassword(password);

  if (application) {
    const { error } = await supabase
      .from("clan_member_applications")
      .update({
        password_hash: passwordHash,
        status: "Approved"
      })
      .eq("id", application.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("clan_member_applications")
      .insert({
        username,
        discord_tag: "",
        password_hash: passwordHash,
        game: "Minecraft Java",
        rank: "BVR",
        preferred_tryout: false,
        status: "Approved"
      });

    if (error) throw error;
  }

  const { error:memberError } = await supabase
    .from("clan_members")
    .upsert({
      username,
      discord_tag: application?.discord_tag || "",
      avatar_url: application?.avatar_url || null,
      game: application?.game || "Minecraft Java",
      rank: application?.rank || "BVR",
      staff_rank: "N/A",
      is_staff: false
    }, {
      onConflict: "username"
    });

  if (memberError) throw memberError;
}

async function setAsMember(account) {
  await ensureNormalMemberAccount(account);

  if (account.staffAccount) {
    const { error } = await supabase
      .from("staff_accounts")
      .delete()
      .eq("username", account.staffAccount.username);

    if (error) throw error;
  }

  const profile = getProfile();

  if (
    profile &&
    String(profile.username || "").toLowerCase() === account.key
  ) {
    localStorage.removeItem("blackVelvetProfile");
  }
}

async function removeAccount(account) {
  const operations = [];

  if (account.staffAccount) {
    operations.push(
      supabase
        .from("staff_accounts")
        .delete()
        .eq("username", account.staffAccount.username)
    );
  }

  if (account.member) {
    operations.push(
      supabase
        .from("clan_members")
        .delete()
        .eq("id", account.member.id)
    );

    operations.push(
      supabase
        .from("clan_member_applications")
        .delete()
        .ilike("username", account.member.username)
    );
  }

  const results = await Promise.all(operations);
  const failed = results.find(result => result.error);

  if (failed) {
    throw failed.error;
  }

  const profile = getProfile();

  if (
    profile &&
    String(profile.username || "").toLowerCase() === account.key
  ) {
    localStorage.removeItem("blackVelvetProfile");
  }
}

list?.addEventListener("change", async event => {
  const select = event.target.closest("select[data-directory-role]");

  if (!select || !canManageStaff()) return;

  const account = getDirectory().find(
    item => item.key === select.dataset.directoryRole
  );

  if (!account) return;

  select.disabled = true;
  setMessage(`Updating ${account.username}'s staff rank...`);

  try {
    await changeStaffRank(account, select.value);
    setMessage(
      `${account.username}'s staff rank is now ${select.value}.`,
      "success"
    );
    await loadDirectory();
  } catch (error) {
    setMessage(`Could not update staff rank: ${error.message}`, "error");
    await loadDirectory();
  } finally {
    select.disabled = false;
  }
});

list?.addEventListener("click", async event => {
  if (!canManageStaff()) return;

  const memberButton = event.target.closest("button[data-set-member]");
  const removeButton = event.target.closest(
    "button[data-remove-directory-account]"
  );

  const key =
    memberButton?.dataset.setMember ||
    removeButton?.dataset.removeDirectoryAccount;

  if (!key) return;

  const account = getDirectory().find(item => item.key === key);

  if (!account) return;

  if (memberButton) {
    const confirmed = window.confirm(
      `Set ${account.username} as a normal member? Their staff access and verification checkmark will be removed.`
    );

    if (!confirmed) return;

    memberButton.disabled = true;
    setMessage(`Converting ${account.username} to a normal member...`);

    try {
      await setAsMember(account);
      setMessage(
        `${account.username} is now a normal clan member.`,
        "success"
      );
      await loadDirectory();

      if (!getProfile()) {
        window.location.reload();
      }
    } catch (error) {
      setMessage(`Could not set member: ${error.message}`, "error");
      memberButton.disabled = false;
    }

    return;
  }

  if (removeButton) {
    const confirmed = window.confirm(
      `Permanently remove ${account.username}? This removes both staff and linked clan account records.`
    );

    if (!confirmed) return;

    removeButton.disabled = true;
    setMessage(`Removing ${account.username}...`);

    try {
      await removeAccount(account);
      setMessage(`${account.username} was removed.`, "success");
      await loadDirectory();

      if (!getProfile()) {
        window.location.reload();
      }
    } catch (error) {
      setMessage(`Could not remove account: ${error.message}`, "error");
      removeButton.disabled = false;
    }
  }
});

if (list) {
  const observer = new MutationObserver(scheduleRender);

  observer.observe(list, {
    childList: true,
    subtree: false
  });
}

document
  .querySelector('[data-panel="staffAccounts"]')
  ?.addEventListener("click", loadDirectory);

window.addEventListener("storage", event => {
  if (event.key === "blackVelvetProfile") {
    loadDirectory();
  }
});

await loadDirectory();

["staff_accounts", "clan_members"].forEach(table => {
  supabase
    .channel(`staff-directory-${table}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table
      },
      loadDirectory
    )
    .subscribe();
});
