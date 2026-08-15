import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const clanRanks = ["BVR", "ELITE", "LEGEND"];
const games = ["Minecraft Java", "Minecraft Bedrock", "Roblox", "Fortnite", "Other"];
const leadershipRoles = ["Owner", "Admin", "Manager"];
const permanentOwners = ["imjustluckyy", "suoaz"];

const list = document.getElementById("clanStaffToggleList");
const message = document.getElementById("clanMembersMessage");
let members = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
  } catch {
    return null;
  }
}

function canManage() {
  const profile = getProfile();
  const username = String(profile?.username || "").toLowerCase();
  const role = String(profile?.role || profile?.staffRank || "");

  return permanentOwners.includes(username) || leadershipRoles.includes(role);
}

function setMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = `action-message ${type}`;
}

function getMemberById(id) {
  return members.find(member => String(member.id) === String(id));
}

function optionList(values, selected) {
  return values.map(value => `
    <option value="${escapeHtml(value)}" ${String(selected) === value ? "selected" : ""}>
      ${escapeHtml(value)}
    </option>
  `).join("");
}

function renderMembers() {
  if (!list || !canManage()) return;

  list.innerHTML = members.length
    ? members.map(member => {
        const isStaff = Boolean(member.is_staff);
        const staffRank = staffRoles.includes(member.staff_rank)
          ? member.staff_rank
          : "Helper";

        return `
          <article class="log-card" data-clan-staff-card="${escapeHtml(member.id)}">
            <div class="log-title">
              <span>
                ${escapeHtml(member.username)}
                ${isStaff ? '<span class="verified-badge" title="Verified staff">✓</span>' : ""}
              </span>
              <span class="log-status">${isStaff ? `STAFF · ${escapeHtml(staffRank)}` : "MEMBER"}</span>
            </div>

            <div class="log-grid">
              <div class="log-field">
                <span>Game</span>
                <strong>${escapeHtml(member.game || "N/A")}</strong>
              </div>
              <div class="log-field">
                <span>Clan Rank</span>
                <strong>${escapeHtml(member.rank || "N/A")}</strong>
              </div>
              <div class="log-field">
                <span>Ranking</span>
                <strong>${escapeHtml(member.ranking || "N/A")}</strong>
              </div>
              <div class="log-field">
                <span>Staff Rank</span>
                <strong>${isStaff ? escapeHtml(staffRank) : "N/A"}</strong>
              </div>
            </div>

            <div class="card-actions">
              <label class="checkbox-row">
                <input type="checkbox" data-staff-toggle="${escapeHtml(member.id)}" ${isStaff ? "checked" : ""} />
                <span>Staff member?</span>
              </label>

              <label>
                Staff Rank
                <select data-staff-rank="${escapeHtml(member.id)}" ${isStaff ? "" : "disabled"}>
                  ${optionList(staffRoles, staffRank)}
                </select>
              </label>

              <label>
                Clan Rank
                <select data-clan-rank="${escapeHtml(member.id)}">
                  ${optionList(clanRanks, member.rank || "BVR")}
                </select>
              </label>

              <label>
                Ranking
                <input
                  type="text"
                  value="${escapeHtml(member.ranking || "")}"
                  placeholder="1# or 4#"
                  data-member-ranking="${escapeHtml(member.id)}"
                />
              </label>

              <label>
                Game Type
                <select data-member-game="${escapeHtml(member.id)}">
                  ${optionList(games, member.game || "Minecraft Java")}
                </select>
              </label>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">No clan members found.</div>`;
}

async function loadMembers() {
  if (!list || !canManage()) return;

  const { data, error } = await supabase
    .from("clan_members")
    .select("*")
    .order("username", { ascending: true });

  if (error) {
    setMessage(`Could not load clan members: ${error.message}`, "error");
    return;
  }

  members = data || [];
  renderMembers();
  window.dispatchEvent(new CustomEvent("blackVelvetStaffAccountsRefresh"));
}

async function saveMember(member, changes) {
  const { error } = await supabase
    .from("clan_members")
    .update(changes)
    .eq("id", member.id);

  if (error) throw error;

  const { data, error: verifyError } = await supabase
    .from("clan_members")
    .select("*")
    .eq("id", member.id)
    .maybeSingle();

  if (verifyError) throw verifyError;

  for (const [key, value] of Object.entries(changes)) {
    if (String(data?.[key] ?? "N/A") !== String(value ?? "N/A")) {
      throw new Error(`Supabase did not confirm the ${key} change.`);
    }
  }
}

list?.addEventListener("change", async event => {
  if (!canManage()) return;

  const checkbox = event.target.closest("[data-staff-toggle]");
  const staffSelect = event.target.closest("[data-staff-rank]");
  const clanSelect = event.target.closest("[data-clan-rank]");
  const gameSelect = event.target.closest("[data-member-game]");

  const control = checkbox || staffSelect || clanSelect || gameSelect;
  if (!control) return;

  const member = getMemberById(
    control.dataset.staffToggle ||
    control.dataset.staffRank ||
    control.dataset.clanRank ||
    control.dataset.memberGame
  );

  if (!member) return;

  const card = control.closest("[data-clan-staff-card]");
  const rankingInput = card?.querySelector("[data-member-ranking]");
  const changes = {};

  if (checkbox) {
    changes.is_staff = checkbox.checked;
    changes.staff_rank = checkbox.checked
      ? (staffRoles.includes(member.staff_rank) ? member.staff_rank : "Helper")
      : "N/A";
  } else if (staffSelect) {
    changes.is_staff = true;
    changes.staff_rank = staffSelect.value;
  } else if (clanSelect) {
    changes.rank = clanSelect.value;
  } else if (gameSelect) {
    changes.game = gameSelect.value;
  }

  if (rankingInput) changes.ranking = rankingInput.value.trim() || "N/A";

  card?.querySelectorAll("input, select").forEach(item => item.disabled = true);
  setMessage(`Saving ${member.username}...`);

  try {
    await saveMember(member, changes);
    setMessage(`${member.username}'s account was saved and confirmed in Supabase ✓`, "success");
    await loadMembers();
  } catch (error) {
    setMessage(`Could not save ${member.username}: ${error.message}`, "error");
    await loadMembers();
  }
});

list?.addEventListener("blur", event => {
  const input = event.target.closest("[data-member-ranking]");
  if (!input || !canManage()) return;

  const member = getMemberById(input.dataset.memberRanking);
  if (!member) return;

  saveMember(member, {
    ranking: input.value.trim() || "N/A"
  }).then(() => {
    setMessage(`${member.username}'s ranking was saved ✓`, "success");
    loadMembers();
  }).catch(error => {
    setMessage(`Could not save ranking: ${error.message}`, "error");
  });
}, true);

document.querySelector('[data-panel="clanMembers"]')
  ?.addEventListener("click", loadMembers);

window.addEventListener("blackVelvetStaffAccountsRefresh", () => {
  if (document.getElementById("staffAccounts")?.classList.contains("active-panel")) {
    window.dispatchEvent(new CustomEvent("blackVelvetStaffDirectoryRefresh"));
  }
});

await loadMembers();

supabase.channel("live-clan-staff-toggle")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "clan_members"
  }, loadMembers)
  .subscribe();
