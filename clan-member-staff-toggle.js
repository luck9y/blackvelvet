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
  const role = String(profile?.role || profile?.staffRank || "");

  return permanentOwners.includes(username) ||
    leadershipRoles.includes(role);
}

function setMessage(text, type = "") {
  if (!message) return;

  message.textContent = text;
  message.className = `action-message ${type}`;
}

function validStaffRank(rank) {
  return staffRoles.includes(rank) ? rank : "Helper";
}

function getMemberById(id) {
  return members.find(member => String(member.id) === String(id));
}

function renderMembers() {
  if (!list || !canManage()) return;

  list.innerHTML = members.length
    ? members.map(member => {
        const isStaff = Boolean(
          member.is_staff && member.staff_rank && member.staff_rank !== "N/A"
        );

        const rank = validStaffRank(member.staff_rank);

        return `
          <article class="log-card" data-clan-staff-card="${escapeHtml(member.id)}">
            <div class="log-title">
              <span>
                ${escapeHtml(member.username)}
                ${isStaff
                  ? '<span class="verified-badge" title="Verified staff">✓</span>'
                  : ""}
              </span>
              <span class="log-status">
                ${isStaff ? `STAFF · ${escapeHtml(rank)}` : "MEMBER"}
              </span>
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

              <div class="log-field">
                <span>Saved Status</span>
                <strong>${isStaff ? "Staff verified ✓" : "Normal member"}</strong>
              </div>
            </div>

            <div class="card-actions">
              <label class="checkbox-row">
                <input
                  type="checkbox"
                  data-staff-toggle="${escapeHtml(member.id)}"
                  ${isStaff ? "checked" : ""}
                />
                <span>Staff member?</span>
              </label>

              <label>
                Staff Rank
                <select
                  data-staff-rank="${escapeHtml(member.id)}"
                  ${isStaff ? "" : "disabled"}
                >
                  ${staffRoles.map(role => `
                    <option value="${role}" ${rank === role ? "selected" : ""}>
                      ${role}
                    </option>
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

  window.dispatchEvent(new CustomEvent("blackVelvetStaffAccountsRefresh"));
}

async function saveMemberStaffStatus(member, isStaff, staffRank) {
  const { error } = await supabase
    .from("clan_members")
    .update({
      is_staff: isStaff,
      staff_rank: staffRank
    })
    .eq("id", member.id);

  if (error) throw error;

  const { data: savedMember, error: verifyError } = await supabase
    .from("clan_members")
    .select("id,is_staff,staff_rank")
    .eq("id", member.id)
    .maybeSingle();

  if (verifyError) throw verifyError;

  if (
    !savedMember ||
    Boolean(savedMember.is_staff) !== isStaff ||
    String(savedMember.staff_rank || "N/A") !== String(staffRank)
  ) {
    throw new Error("Supabase did not confirm the staff status change.");
  }
}

list?.addEventListener("change", async event => {
  if (!canManage()) return;

  const checkbox = event.target.closest("[data-staff-toggle]");
  const select = event.target.closest("[data-staff-rank]");

  if (checkbox) {
    const id = checkbox.dataset.staffToggle;
    const member = getMemberById(id);

    if (!member) return;

    const isStaff = checkbox.checked;
    const staffRank = isStaff ? validStaffRank(member.staff_rank) : "N/A";
    const card = checkbox.closest("[data-clan-staff-card]");
    const controls = card?.querySelectorAll("input, select");

    controls?.forEach(control => {
      control.disabled = true;
    });

    setMessage(
      isStaff
        ? `Saving ${member.username} as staff...`
        : `Removing staff access from ${member.username}...`
    );

    try {
      await saveMemberStaffStatus(member, isStaff, staffRank);

      setMessage(
        isStaff
          ? `${member.username} is now staff and confirmed in Supabase ✓`
          : `${member.username} is now a normal member and confirmed in Supabase ✓`,
        "success"
      );

      await loadMembers();
    } catch (error) {
      checkbox.checked = !isStaff;
      setMessage(`Could not save staff status: ${error.message}`, "error");
      controls?.forEach(control => {
        control.disabled = control.matches("[data-staff-rank]")
          ? !checkbox.checked
          : false;
      });
    }

    return;
  }

  if (select) {
    const id = select.dataset.staffRank;
    const member = getMemberById(id);

    if (!member) return;

    select.disabled = true;
    setMessage(`Saving ${member.username}'s staff rank...`);

    try {
      await saveMemberStaffStatus(member, true, select.value);

      setMessage(
        `${member.username}'s staff rank is ${select.value}. Confirmed in Supabase ✓`,
        "success"
      );

      await loadMembers();
    } catch (error) {
      setMessage(`Could not save staff rank: ${error.message}`, "error");
      select.disabled = false;
    }
  }
});

document
  .querySelector('[data-panel="clanMembers"]')
  ?.addEventListener("click", loadMembers);

window.addEventListener(
  "blackVelvetStaffAccountsRefresh",
  () => {
    if (document.getElementById("staffAccounts")?.classList.contains("active-panel")) {
      window.dispatchEvent(new CustomEvent("blackVelvetStaffDirectoryRefresh"));
    }
  }
);

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
