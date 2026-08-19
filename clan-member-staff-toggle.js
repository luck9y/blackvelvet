import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AUTH_STORAGE_KEY = "black-velvet-supabase-auth";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk",
  {
    auth: {
      storage: window.localStorage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

const staffRoles = [
  "N/A",
  "Owner",
  "Administrator",
  "Admin",
  "Manager",
  "President",
  "Mod",
  "Helper"
];

const clanRanks = [
  "GOAT",
  "ELITE",
  "LEGEND",
  "DECENT",
  "ROOKIE"
];

const games = [
  "Valorant",
  "Rocket League",
  "Fortnite",
  "Roblox",
  "Minecraft Java",
  "Minecraft Bedrock",
  "Call of Duty"
];

const memberFilters = [
  "ALL",
  "STAFF",
  "VALORANT",
  "RL",
  "FORTNITE",
  "ROBLOX",
  "MCJ",
  "MCB",
  "COD"
];

const leadershipRoles = [
  "owner",
  "administrator",
  "admin",
  "manager",
  "management",
  "president"
];

const permanentOwners = [
  "administrator",
  "imtherealluckyy",
  "imjustluckyy",
  "suoaz",
  "managergear",
  "gears"
];

const list = document.getElementById("clanStaffToggleList");
const message = document.getElementById("clanMembersMessage");

let members = [];
let loadingMembers = false;
let activeFilter = "ALL";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
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

function getProfile() {
  try {
    return JSON.parse(
      localStorage.getItem("blackVelvetProfile") || "null"
    );
  } catch {
    return null;
  }
}

function canManage() {
  const profile = getProfile();
  const username = normalize(profile?.username);

  const role = normalize(
    profile?.role ||
    profile?.staffRank ||
    profile?.staff_role ||
    profile?.staffRole
  );

  const accountType = normalize(
    profile?.type ||
    profile?.accountType ||
    profile?.account_type
  );

  return Boolean(
    permanentOwners.includes(username) ||
    leadershipRoles.includes(role) ||
    (
      (
        profile?.isStaff === true ||
        profile?.is_staff === true ||
        profile?.staff === true
      ) &&
      leadershipRoles.includes(role)
    ) ||
    (
      permanentOwners.includes(username) &&
      ["staff", "owner", "admin", "administrator"].includes(accountType)
    )
  );
}

function setMessage(text, type = "") {
  if (!message) return;

  message.textContent = text;
  message.className = `action-message ${type}`;
}

function showListError(text) {
  if (!list) return;

  list.innerHTML = `
    <div class="empty-state loading-error">
      <strong>Members and staff could not be loaded.</strong>
      <span>${escapeHtml(text)}</span>
      <button class="loading-retry" type="button" data-retry-members>
        Retry
      </button>
    </div>
  `;
}

function getMemberById(id) {
  return members.find(
    member => String(member.id) === String(id)
  );
}

function getStaffRank(member) {
  const matchingRole = staffRoles.find(
    role => normalize(role) === normalize(member.staff_rank)
  );

  return matchingRole || "N/A";
}

function getClanRank(member) {
  const matchingRank = clanRanks.find(
    rank => normalize(rank) === normalize(member.rank)
  );

  return matchingRank || "ROOKIE";
}

function isStaffMember(member) {
  return Boolean(member.is_staff) && getStaffRank(member) !== "N/A";
}

function isBannedMember(member) {
  return member.is_banned === true;
}

function optionList(values, selected) {
  return values.map(value => `
    <option
      value="${escapeHtml(value)}"
      ${normalize(selected) === normalize(value) ? "selected" : ""}
    >
      ${escapeHtml(value)}
    </option>
  `).join("");
}

function gameMatchesFilter(game, filter) {
  const normalizedGame = normalize(game);

  const aliases = {
    VALORANT: ["valorant"],
    RL: ["rocket league", "rl"],
    FORTNITE: ["fortnite"],
    ROBLOX: ["roblox"],
    MCJ: ["minecraft java", "mc java", "mcj", "java"],
    MCB: ["minecraft bedrock", "mc bedrock", "mcb", "bedrock"],
    COD: ["call of duty", "cod"]
  };

  return (aliases[filter] || []).some(alias =>
    normalizedGame === alias ||
    normalizedGame.includes(alias)
  );
}

function getGameAppearanceClass(game) {
  const normalizedGame = normalize(game);

  if (normalizedGame.includes("valorant")) {
    return "member-game-valorant";
  }

  if (
    normalizedGame.includes("rocket league") ||
    normalizedGame === "rl"
  ) {
    return "member-game-rl";
  }

  if (normalizedGame.includes("fortnite")) {
    return "member-game-fortnite";
  }

  if (normalizedGame.includes("roblox")) {
    return "member-game-roblox";
  }

  if (
    normalizedGame.includes("minecraft java") ||
    normalizedGame.includes("mc java") ||
    normalizedGame === "mcj" ||
    normalizedGame === "java"
  ) {
    return "member-game-mcj";
  }

  if (
    normalizedGame.includes("minecraft bedrock") ||
    normalizedGame.includes("mc bedrock") ||
    normalizedGame === "mcb" ||
    normalizedGame === "bedrock"
  ) {
    return "member-game-mcb";
  }

  if (
    normalizedGame.includes("call of duty") ||
    normalizedGame === "cod"
  ) {
    return "member-game-cod";
  }

  return "";
}

function getMemberAppearanceClasses(member) {
  const rank = getClanRank(member);
  const gameClass = getGameAppearanceClass(member.game);

  return [
    `member-rank-${normalize(rank)}`,
    gameClass,
    isStaffMember(member) ? "member-is-staff" : "",
    isBannedMember(member) ? "member-is-banned" : ""
  ].filter(Boolean).join(" ");
}

function getFilteredMembers() {
  if (activeFilter === "ALL") {
    return members;
  }

  if (activeFilter === "STAFF") {
    return members.filter(isStaffMember);
  }

  return members.filter(member =>
    gameMatchesFilter(member.game, activeFilter)
  );
}

function createMemberStyles() {
  if (document.getElementById("clanMemberPanelStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "clanMemberPanelStyles";
  style.textContent = `
    .member-filter-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: 0 0 17px;
      padding: 10px;
      border: 1px solid #30363d;
      border-radius: 8px;
      background: rgba(16, 19, 23, .88);
    }

    .member-filter-button {
      min-width: 66px;
      padding: 8px 11px;
      border: 1px solid #454d56;
      border-radius: 5px;
      color: #aab1b8;
      background: #20252a;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .8px;
    }

    .member-filter-button:hover {
      color: #fff;
      background: #30363d;
    }

    .member-filter-button.active {
      border-color: #d9dde1;
      color: #08090b;
      background: #d9dde1;
      box-shadow: 0 0 14px rgba(217, 221, 225, .18);
    }

    #clanStaffToggleList .log-card {
      --rank-outline: #68727c;
      --rank-glow: rgba(104, 114, 124, .55);
      --game-background:
        linear-gradient(135deg, #1b1f24, #101215);

      position: relative;
      overflow: hidden;
      border: 2px solid var(--rank-outline);
      background: var(--game-background);
      box-shadow:
        0 0 8px var(--rank-glow),
        0 0 16px var(--rank-glow);
      transition:
        border-color .2s ease,
        box-shadow .2s ease,
        transform .2s ease,
        opacity .2s ease;
    }

    #clanStaffToggleList .log-card::before {
      display: none;
    }

    #clanStaffToggleList .member-game-valorant {
      --game-background:
        linear-gradient(135deg, #e61f38, #8e0c1d 55%, #34070d);
    }

    #clanStaffToggleList .member-game-rl {
      --game-background:
        linear-gradient(135deg, #1264d8, #083b88 55%, #061c43);
    }

    #clanStaffToggleList .member-game-fortnite {
      --game-background:
        linear-gradient(135deg, #60c8ff, #287caf 55%, #123a59);
    }

    #clanStaffToggleList .member-game-roblox {
      --game-background:
        linear-gradient(135deg, #7b1018, #47080e 55%, #210306);
    }

    #clanStaffToggleList .member-game-mcj {
      --game-background:
        linear-gradient(135deg, #23863c, #145426 55%, #092b14);
    }

    #clanStaffToggleList .member-game-mcb {
      --game-background:
        linear-gradient(135deg, #79502d, #4d3019 55%, #29180c);
    }

    #clanStaffToggleList .member-game-cod {
      --game-background:
        linear-gradient(135deg, #111315, #030405 60%, #000);
    }

    #clanStaffToggleList .member-rank-goat {
      --rank-outline: #fff;
      --rank-glow: rgba(255, 255, 255, .82);
    }

    #clanStaffToggleList .member-rank-elite {
      --rank-outline: #ff304f;
      --rank-glow: rgba(255, 48, 79, .65);
    }

    #clanStaffToggleList .member-rank-legend {
      --rank-outline: #258cff;
      --rank-glow: rgba(37, 140, 255, .65);
    }

    #clanStaffToggleList .member-rank-decent {
      --rank-outline: #74d4ff;
      --rank-glow: rgba(116, 212, 255, .62);
    }

    #clanStaffToggleList .member-rank-rookie {
      --rank-outline: #7ee89a;
      --rank-glow: rgba(126, 232, 154, .55);
    }

    #clanStaffToggleList .log-card.member-is-staff {
      box-shadow:
        0 0 7px var(--rank-glow),
        0 0 14px var(--rank-glow),
        0 0 0 3px rgba(0, 0, 0, .95),
        0 0 12px 5px rgba(0, 0, 0, .9),
        0 0 24px 7px rgba(0, 105, 255, .82),
        0 0 42px 10px rgba(0, 153, 255, .52),
        0 0 65px 14px rgba(20, 92, 255, .28);
    }

    #clanStaffToggleList .log-card.member-is-banned {
      filter: saturate(.7);
    }

    #clanStaffToggleList .log-card:hover {
      transform: translateY(-1px);
      box-shadow:
        0 0 11px var(--rank-glow),
        0 0 22px var(--rank-glow);
    }

    #clanStaffToggleList .log-card.member-is-staff:hover {
      box-shadow:
        0 0 10px var(--rank-glow),
        0 0 20px var(--rank-glow),
        0 0 0 3px #000,
        0 0 15px 6px rgba(0, 0, 0, .95),
        0 0 30px 9px rgba(0, 119, 255, .95),
        0 0 52px 13px rgba(0, 170, 255, .65),
        0 0 78px 18px rgba(28, 94, 255, .35);
    }

    #clanStaffToggleList .log-card .log-field,
    #clanStaffToggleList .log-card .card-actions label {
      background: rgba(0, 0, 0, .18);
      border-radius: 5px;
    }

    #clanStaffToggleList .log-card .log-field {
      padding: 8px;
    }

    #clanStaffToggleList .member-ban-control {
      display: grid;
      align-content: center;
      gap: 6px;
      padding: 8px;
      color: #d9dde1;
      font-size: 11px;
      font-weight: 700;
    }

    #clanStaffToggleList .member-ban-button {
      min-width: 100px;
      padding: 9px 14px;
      border: 1px solid #ff4d5f;
      border-radius: 6px;
      color: #ffd6da;
      background: #741622;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    #clanStaffToggleList .member-ban-button:hover {
      color: #fff;
      background: #a51d2d;
    }

    #clanStaffToggleList .member-ban-button.is-banned {
      border-color: #6fd994;
      color: #d8ffe5;
      background: #175e30;
    }

    #clanStaffToggleList .member-ban-button.is-banned:hover {
      background: #217d42;
    }

    #clanStaffToggleList .member-ban-button:disabled {
      cursor: wait;
      opacity: .6;
    }

    #clanStaffToggleList .member-banned-badge {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
      padding: 3px 7px;
      border: 1px solid #ff6474;
      border-radius: 999px;
      color: #fff;
      background: #a31325;
      box-shadow: 0 0 10px rgba(255, 28, 58, .55);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1px;
      vertical-align: middle;
    }
  `;

  document.head.appendChild(style);
}

function createFilterToolbar() {
  if (!list) return;

  createMemberStyles();

  if (document.getElementById("memberFilterToolbar")) {
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.id = "memberFilterToolbar";
  toolbar.className = "member-filter-toolbar";
  toolbar.setAttribute("aria-label", "Filter members");

  toolbar.innerHTML = memberFilters.map(filter => `
    <button
      class="member-filter-button ${filter === activeFilter ? "active" : ""}"
      type="button"
      data-member-filter="${filter}"
      aria-pressed="${filter === activeFilter}"
    >
      ${filter}
    </button>
  `).join("");

  list.before(toolbar);

  toolbar.addEventListener("click", event => {
    const button = event.target.closest("[data-member-filter]");

    if (!button) return;

    activeFilter = button.dataset.memberFilter;

    toolbar.querySelectorAll("[data-member-filter]").forEach(item => {
      const selected = item.dataset.memberFilter === activeFilter;

      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    renderMembers();
  });
}

function renderMembers() {
  if (!list) return;

  const filteredMembers = getFilteredMembers();

  list.innerHTML = filteredMembers.length
    ? filteredMembers.map(member => {
        const staffRank = getStaffRank(member);
        const clanRank = getClanRank(member);
        const isStaff = isStaffMember(member);
        const isBanned = isBannedMember(member);

        const ranking =
          member.ranking ??
          member.ranking_number ??
          "N/A";

        const selectedGame = games.find(
          game => normalize(game) === normalize(member.game)
        ) || games[0];

        return `
          <article
            class="log-card ${getMemberAppearanceClasses(member)}"
            data-clan-staff-card="${escapeHtml(member.id)}"
          >
            <div class="log-title">
              <span>
                ${escapeHtml(member.username)}
                ${
                  isStaff
                    ? '<span class="verified-badge" title="Verified staff">✓</span>'
                    : ""
                }
                ${
                  isBanned
                    ? '<span class="member-banned-badge">BANNED</span>'
                    : ""
                }
              </span>

              <span class="log-status">
                ${
                  isStaff
                    ? `STAFF · ${escapeHtml(staffRank)}`
                    : "MEMBER · N/A"
                }
              </span>
            </div>

            <div class="log-grid">
              <div class="log-field">
                <span>Game</span>
                <strong>${escapeHtml(member.game || "N/A")}</strong>
              </div>

              <div class="log-field">
                <span>Clan Rank</span>
                <strong>${escapeHtml(clanRank)}</strong>
              </div>

              <div class="log-field">
                <span>Ranking</span>
                <strong>${escapeHtml(ranking)}</strong>
              </div>

              <div class="log-field">
                <span>Staff Rank</span>
                <strong>
                  ${isStaff ? escapeHtml(staffRank) : "N/A"}
                </strong>
              </div>
            </div>

            <div class="card-actions">
              <label>
                Staff Rank
                <select data-staff-rank="${escapeHtml(member.id)}">
                  ${optionList(
                    staffRoles,
                    isStaff ? staffRank : "N/A"
                  )}
                </select>
              </label>

              <label>
                Clan Rank
                <select data-clan-rank="${escapeHtml(member.id)}">
                  ${optionList(clanRanks, clanRank)}
                </select>
              </label>

              <label>
                Ranking
                <input
                  type="text"
                  value="${escapeHtml(
                    ranking === "N/A" ? "" : ranking
                  )}"
                  placeholder="1# or 4#"
                  data-member-ranking="${escapeHtml(member.id)}"
                >
              </label>

              <label>
                Game Type
                <select data-member-game="${escapeHtml(member.id)}">
                  ${optionList(games, selectedGame)}
                </select>
              </label>

              <div class="member-ban-control">
                <span>Account Access</span>
                <button
                  class="member-ban-button ${isBanned ? "is-banned" : ""}"
                  type="button"
                  data-member-ban="${escapeHtml(member.id)}"
                  aria-pressed="${isBanned}"
                >
                  ${isBanned ? "UNBAN" : "BAN"}
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : `
      <div class="empty-state">
        ${
          members.length
            ? `No members match the ${escapeHtml(activeFilter)} panel.`
            : `No clan members were found. If an application was approved,
               confirm that approval created a row in the clan_members table.`
        }
      </div>
    `;
}

async function loadMembers() {
  if (!list || loadingMembers) return;

  createFilterToolbar();

  if (!canManage()) {
    const text =
      "This account is not recognized as an owner, administrator, manager, or president.";

    setMessage(text, "error");
    showListError(text);
    return;
  }

  loadingMembers = true;

  list.innerHTML = `
    <div class="empty-state loading">
      Loading members and staff...
    </div>
  `;

  setMessage("Loading members and staff...");

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.user) {
      throw new Error(
        "No Supabase login session was found. Sign out and sign in again."
      );
    }

    const { data, error } = await supabase
      .from("clan_members")
      .select("*")
      .order("username", { ascending: true });

    if (error) {
      throw error;
    }

    members = data || [];
    renderMembers();

    setMessage(
      `${members.length} member account(s) loaded.`,
      "success"
    );

    window.dispatchEvent(
      new CustomEvent("blackVelvetStaffAccountsRefresh")
    );
  } catch (error) {
    const text = error?.message || "Unknown Supabase error.";

    console.error("Could not load clan members:", error);
    setMessage(`Could not load clan members: ${text}`, "error");
    showListError(text);
  } finally {
    loadingMembers = false;
  }
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

  if (!data) {
    throw new Error("The updated member could not be verified.");
  }

  for (const [key, value] of Object.entries(changes)) {
    if (
      String(data[key] ?? "N/A") !==
      String(value ?? "N/A")
    ) {
      throw new Error(
        `Supabase did not confirm the ${key} change.`
      );
    }
  }
}

list?.addEventListener("click", async event => {
  if (event.target.closest("[data-retry-members]")) {
    loadMembers();
    return;
  }

  const banButton = event.target.closest("[data-member-ban]");

  if (!banButton || !canManage()) return;

  const member = getMemberById(banButton.dataset.memberBan);

  if (!member) return;

  const shouldBan = !isBannedMember(member);
  const action = shouldBan ? "Banning" : "Unbanning";
  const card = banButton.closest("[data-clan-staff-card]");

  card?.querySelectorAll("input, select, button").forEach(control => {
    control.disabled = true;
  });

  setMessage(`${action} ${member.username}...`);

  try {
    await saveMember(member, {
      is_banned: shouldBan
    });

    setMessage(
      `${member.username} was ${shouldBan ? "banned" : "unbanned"} successfully ✓`,
      "success"
    );

    await loadMembers();
  } catch (error) {
    setMessage(
      `Could not ${shouldBan ? "ban" : "unban"} ${member.username}: ${error.message}`,
      "error"
    );

    await loadMembers();
  }
});

list?.addEventListener("change", async event => {
  if (!canManage()) return;

  const staffSelect = event.target.closest("[data-staff-rank]");
  const clanSelect = event.target.closest("[data-clan-rank]");
  const gameSelect = event.target.closest("[data-member-game]");

  const control = staffSelect || clanSelect || gameSelect;

  if (!control) return;

  const member = getMemberById(
    control.dataset.staffRank ||
    control.dataset.clanRank ||
    control.dataset.memberGame
  );

  if (!member) return;

  const card = control.closest("[data-clan-staff-card]");
  const changes = {};

  if (staffSelect) {
    changes.is_staff = staffSelect.value !== "N/A";
    changes.staff_rank = staffSelect.value;
  } else if (clanSelect) {
    changes.rank = clanSelect.value;
  } else if (gameSelect) {
    changes.game = gameSelect.value;
  }

  card?.querySelectorAll("input, select, button").forEach(item => {
    item.disabled = true;
  });

  setMessage(`Saving ${member.username}...`);

  try {
    await saveMember(member, changes);

    setMessage(
      `${member.username}'s account was saved and confirmed in Supabase ✓`,
      "success"
    );

    await loadMembers();
  } catch (error) {
    setMessage(
      `Could not save ${member.username}: ${error.message}`,
      "error"
    );

    await loadMembers();
  }
});

list?.addEventListener("blur", event => {
  const input = event.target.closest("[data-member-ranking]");

  if (!input || !canManage()) return;

  const member = getMemberById(
    input.dataset.memberRanking
  );

  if (!member) return;

  saveMember(member, {
    ranking: input.value.trim() || "N/A"
  }).then(() => {
    setMessage(
      `${member.username}'s ranking was saved ✓`,
      "success"
    );

    loadMembers();
  }).catch(error => {
    setMessage(
      `Could not save ranking: ${error.message}`,
      "error"
    );
  });
}, true);

document
  .querySelector('[data-panel="clanMembers"]')
  ?.addEventListener("click", loadMembers);

window.addEventListener("storage", event => {
  if (
    event.key === "blackVelvetProfile" ||
    event.key === AUTH_STORAGE_KEY
  ) {
    loadMembers();
  }
});

createFilterToolbar();
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
