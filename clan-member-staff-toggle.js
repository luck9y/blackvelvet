import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const staffRoles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];
const leadershipRoles = ["Owner", "Admin", "Manager"];
const permanentOwners = ["imjustluckyy", "suoaz"];

const list = document.getElementById("clanStaffToggleList");
const message = document.getElementById("clanMembersMessage");

let members = [];

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

function canManage() {
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

function validStaffRank(rank) {
  return staffRoles.includes(rank) ? rank : "Helper";
}

function renderMembers() {
  if (!list || !canManage()) return;

  list.innerHTML = members.length
    ? members.map(member => {
        const isStaff = Boolean(member.is_staff && member.staff_rank !== "N/A");
        const rank = validStaffRank(member.staff_rank);

        return `
          <article class="log-card" data-clan-staff-card="${member.id}">
            <div class="log-title">
              <span>${escapeHtml(member.username)} ${isStaff ? '<span class="verified-badge" title="Verified staff">✓</span>' : ""}</span>
              <span class="log-status">${isStaff ? `STAFF · ${escapeHtml(rank)}` : "MEMBER"}</span>
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
                <span>Staff Rank</span>
                <strong>${isStaff ? escapeHtml(rank) : "N/A"}</strong>
              </div>
            </div>

            <div class="card-actions">
              <label class="checkbox-row">
                <input
                  type="checkbox"
                  data-staff-toggle="${member.id}"
                  ${isStaff ? "checked" : ""}
                />
                <span>Staff member?</span>
              </label>

              <label>
                Staff Rank
                <select data-staff-rank="${member.id}" ${isStaff ? "" : "disabled"}>
                  ${staffRoles.map(role => `
                    <option value="${role}" ${rank === role ? "selected" : ""}>${role}</option>
                  `).join("")}
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
    setMessage(`Could not load staff toggles: ${error.message}`, "error");
    return;
  }

  members = data || [];
  renderMembers();
}

list?.addEventListener("change", async event => {
  if (!canManage()) return;

  const checkbox = event.target.closest("[data-staff-toggle]");
  const select = event.target.closest("[data-staff-rank]");

  if (checkbox) {
    const id = Number(checkbox.dataset.staffToggle);
    const member = members.find(item => item.id === id);
    if (!member) return;

    const isStaff = checkbox.checked;
    const staffRank = isStaff ? validStaffRank(member.staff_rank) : "N/A";

    checkbox.disabled = true;
    setMessage(
      isStaff
        ? `Making ${member.username} a staff member as ${staffRank}...`
        : `Setting ${member.username} back to normal member...`
    );

    const { error } = await supabase
      .from("clan_members")
      .update({
        is_staff: isStaff,
        staff_rank: staffRank
      })
      .eq("id", id);

    if (error) {
      setMessage(`Could not update staff status: ${error.message}`, "error");
      checkbox.disabled = false;
      return;
    }

    setMessage(
      isStaff
        ? `${member.username} is now staff. Default rank: ${staffRank}.`
        : `${member.username} is now a normal member.`,
      "success"
    );

    await loadMembers();
  }

  if (select) {
    const id = Number(select.dataset.staffRank);
    const member = members.find(item => item.id === id);
    if (!member) return;

    select.disabled = true;
    setMessage(`Updating ${member.username}'s staff rank...`);

    const { error } = await supabase
      .from("clan_members")
      .update({
        is_staff: true,
        staff_rank: select.value
      })
      .eq("id", id);

    if (error) {
      setMessage(`Could not update staff rank: ${error.message}`, "error");
      select.disabled = false;
      return;
    }

    setMessage(`${member.username}'s staff rank is now ${select.value}.`, "success");
    await loadMembers();
  }
});

document
  .querySelector('[data-panel="clanMembers"]')
  ?.addEventListener("click", loadMembers);

await loadMembers();

supabase
  .channel("live-clan-staff-toggle")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "clan_members"
    },
    loadMembers
  )
  .subscribe();
