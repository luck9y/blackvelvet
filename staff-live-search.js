function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
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

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? escapeHtml(value)
    : escapeHtml(date.toLocaleString());
}

function getValue(row, keys, fallback = "N/A") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  return fallback;
}

function getApplicationAnswer(sources, keys, fallback = "N/A") {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      if (
        source[key] !== undefined &&
        source[key] !== null &&
        source[key] !== ""
      ) {
        return source[key];
      }
    }
  }

  return fallback;
}

function formatLabel(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatStaffAnswer(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return "Yes";
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return "No";
  }

  return displayValue(value);
}

function parseObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function renderField(label, value, answer = false) {
  return `
    <div class="${answer ? "application-answer" : "application-field"}">
      <span>${escapeHtml(formatLabel(label))}</span>
      <strong>${escapeHtml(displayValue(value))}</strong>
    </div>
  `;
}

function renderObjectFields(object, answer = false, excluded = new Set()) {
  if (!object || typeof object !== "object") return "";

  return Object.entries(object)
    .filter(([key, value]) =>
      !excluded.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== ""
    )
    .map(([key, value]) => renderField(key, value, answer))
    .join("");
}

function addApplicationStyles() {
  if (document.getElementById("application-clean-styles")) return;

  const style = document.createElement("style");
  style.id = "application-clean-styles";
  style.textContent = `
    #applicationsList.application-list {
      display: grid;
      gap: 10px;
    }

    #applicationsList .application-card {
      overflow: hidden;
      padding: 0;
      border: 1px solid #3d454c;
      border-radius: 8px;
      color: #b8c0c6;
      background: #181c20;
      box-shadow: 0 6px 18px rgba(0,0,0,.2);
      line-height: 1.25;
    }

    #applicationsList .application-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid #343b41;
      background: #20252a;
    }

    #applicationsList .application-identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    #applicationsList .application-avatar {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      border: 1px solid #59636b;
      border-radius: 50%;
      object-fit: cover;
      background: #14171a;
    }

    #applicationsList .application-header h4 {
      margin: 0 0 3px;
      color: #e1e5e8;
      font-size: 16px;
    }

    #applicationsList .application-type,
    #applicationsList .application-status {
      color: #858f97;
      font-size: 10px;
      letter-spacing: .9px;
      text-transform: uppercase;
    }

    #applicationsList .application-status {
      padding: 4px 8px;
      border: 1px solid #626c74;
      border-radius: 999px;
      background: #2b3136;
    }

    #applicationsList .application-section {
      margin: 0;
      padding: 9px 14px 0;
    }

    #applicationsList .application-section h5 {
      margin: 0 0 5px;
      color: #9ca6ad;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    #applicationsList .application-fields,
    #applicationsList .application-answers {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 4px;
    }

    #applicationsList .application-field,
    #applicationsList .application-answer {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px;
      padding: 5px 8px;
      border: 1px solid #343b41;
      border-radius: 5px;
      background: #20252a;
    }

    #applicationsList .application-field span,
    #applicationsList .application-answer span {
      color: #858f97;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .55px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    #applicationsList .application-field span::after,
    #applicationsList .application-answer span::after {
      content: ":";
      margin-left: 1px;
    }

    #applicationsList .application-field strong,
    #applicationsList .application-answer strong {
      min-width: 0;
      overflow-wrap: anywhere;
      color: #d0d5d9;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.3;
    }

    #applicationsList .application-answer strong {
      white-space: pre-wrap;
    }

    #applicationsList .application-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
      padding: 9px 14px;
      border-top: 1px solid #343b41;
      background: #14171a;
    }

    #applicationsList .application-actions button {
      padding: 6px 10px;
      border: 1px solid #59636b;
      border-radius: 5px;
      color: #cbd1d5;
      background: #292f34;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
    }

    #applicationsList .application-actions button:disabled {
      cursor: wait;
      opacity: .6;
    }

    #applicationsList .muted {
      padding: 5px 0;
      color: #e7a4a4;
      font-size: 11px;
    }

    @media (max-width: 600px) {
      #applicationsList .application-header {
        align-items: flex-start;
        flex-direction: column;
      }

      #applicationsList .application-fields,
      #applicationsList .application-answers {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function renderLoginLogs(rows) {
  const container = document.getElementById("loginLogsList");
  if (!container) return;

  if (!rows.length) {
    container.innerHTML =
      `<div class="empty-state">No login activity has been recorded yet.</div>`;
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="log-card login-card">
      <div class="log-title">
        <strong>${escapeHtml(getValue(row, [
          "username", "user_name", "member_username",
          "staff_username", "account_name", "display_name",
          "full_name", "discord_tag", "email"
        ], "Unknown account"))}</strong>
        <span>${escapeHtml(getValue(row, [
          "account_type", "user_type", "account_role", "member_type"
        ], "Member"))}</span>
      </div>

      <div class="log-grid">
        <div class="log-field">
          <span>Role / Rank</span>
          <strong>${escapeHtml(getValue(row, [
            "role", "staff_rank", "user_role", "rank",
            "member_rank", "permission"
          ]))}</strong>
        </div>

        <div class="log-field">
          <span>Device</span>
          <strong>${escapeHtml(getValue(row, [
            "device_used", "device_name", "device_type",
            "platform", "os"
          ], "Not recorded"))}</strong>
        </div>

        <div class="log-field">
          <span>Time</span>
          <strong>${formatDate(getValue(row, [
            "created_at", "logged_in_at", "login_at", "timestamp"
          ], ""))}</strong>
        </div>

        <div class="log-field">
          <span>Browser</span>
          <strong>${escapeHtml(getValue(row, [
            "browser", "browser_name", "user_agent", "client"
          ], "Not recorded"))}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

function applicationTable(row) {
  return row.application_type === "clan"
    ? "clan_member_applications"
    : "applications";
}

function renderApplications(rows) {
  const container = document.getElementById("applicationsList");
  if (!container) return;

  if (!rows.length) {
    container.innerHTML =
      `<div class="empty-state">No pending applications have been submitted.</div>`;
    return;
  }

  container.innerHTML = rows.map(row => {
    const username = getValue(row, [
      "staff_username", "username", "display_name",
      "full_name", "discord_tag"
    ], "Unknown applicant");

    const status = getValue(row, ["status"], "Pending");
    const type = row.application_type === "clan"
      ? "Clan Member Application"
      : "Staff Application";

    const profile = parseObject(
      row.profile || row.applicant_profile ||
      row.user_profile || row.personal_info
    );

    const answers = parseObject(
      row.answers || row.application_answers ||
      row.responses || row.questions
    );

    const sources = [answers, row, profile].filter(Boolean);

    const profileFields = profile
      ? renderObjectFields(profile)
      : [
          ["Username", username],
          ["Discord", getValue(row, ["discord_tag", "discord"])],
          ["Email", getValue(row, ["email", "email_address"])],
          ["Age", getValue(row, ["age"])],
          ["Country", getValue(row, ["country"])],
          ["Timezone", getValue(row, ["timezone"])]
        ].map(([label, value]) => renderField(label, value)).join("");

    const profilePicture = getApplicationAnswer(sources, [
      "profile_picture", "profile_picture_url", "avatar_url",
      "avatarUrl", "avatar", "image_url", "profile_image"
    ], "");

    const answerFields = [
      [
        "Username",
        getApplicationAnswer(sources, [
          "username", "user_name", "staff_username", "display_name"
        ], username)
      ],
      [
        "Discord User",
        getApplicationAnswer(sources, [
          "discord_user", "discord_username", "discord_tag",
          "discord", "discord_name"
        ])
      ],
      [
        "Rank You Deserve",
        getApplicationAnswer(sources, [
          "rank", "clan_rank", "desired_rank",
          "requested_rank", "role"
        ])
      ],
      [
        "Apply For Staff",
        formatStaffAnswer(getApplicationAnswer(sources, [
          "apply_for_staff", "applying_for_staff",
          "wants_staff", "staff_application",
          "staff_app", "is_staff_application"
        ]))
      ]
    ].map(([label, value]) => renderField(label, value, true)).join("");

    const selectedGames = getValue(row, [
      "games", "selected_games", "game", "game_type", "game_types"
    ]);

    const rank = getValue(row, [
      "rank", "clan_rank", "staff_rank", "role", "desired_rank"
    ]);

    const avatarMarkup = profilePicture
      ? `
        <img
          class="application-avatar"
          src="${escapeHtml(profilePicture)}"
          alt="${escapeHtml(username)} profile picture"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      `
      : `
        <div class="application-avatar application-avatar-empty" aria-hidden="true">
          ${escapeHtml(String(username).charAt(0).toUpperCase())}
        </div>
      `;

    return `
      <article class="application-card" data-application-id="${escapeHtml(row.id)}">
        <div class="application-header">
          <div class="application-identity">
            ${avatarMarkup}
            <div>
              <h4>${escapeHtml(username)}</h4>
              <span class="application-type">${escapeHtml(type)}</span>
            </div>
          </div>
          <span class="application-status">${escapeHtml(status)}</span>
        </div>

        <section class="application-section">
          <h5>Applicant Profile</h5>
          <div class="application-fields">${profileFields}</div>
        </section>

        <section class="application-section">
          <h5>Selected Games &amp; Rank</h5>
          <div class="application-fields">
            ${renderField("Games Selected", selectedGames)}
            ${renderField("Requested Role / Rank", rank)}
            ${renderField(
              "Submitted",
              getValue(row, ["created_at", "submitted_at"], "Unknown date")
            )}
          </div>
        </section>

        <section class="application-section">
          <h5>Application Answers</h5>
          <div class="application-answers">${answerFields}</div>
        </section>

        <div class="application-actions">
          <button
            type="button"
            data-application-status="Approved"
            data-application-table="${escapeHtml(applicationTable(row))}"
            data-application-id="${escapeHtml(row.id)}"
          >Accept &amp; Create Account</button>

          <button
            type="button"
            data-application-status="Denied"
            data-application-table="${escapeHtml(applicationTable(row))}"
            data-application-id="${escapeHtml(row.id)}"
          >Deny &amp; Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function getSupabase() {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );

  return createClient(
    "https://ptgzhljvzyceawwohmym.supabase.co",
    "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
  );
}

function renderError(container, title, error) {
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state loading-error">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(error?.message || "Unknown Supabase error.")}</span>
      <button class="loading-retry" type="button" data-staff-retry>Retry</button>
    </div>
  `;

  container.querySelector("[data-staff-retry]")?.addEventListener(
    "click",
    loadStaffData
  );
}

async function loadStaffData() {
  const logs = document.getElementById("loginLogsList");
  const applications = document.getElementById("applicationsList");

  if (!logs && !applications) return;

  try {
    const supabase = await getSupabase();

    const [accessLogs, memberLogs, staffApplications, clanApplications] =
      await Promise.all([
        supabase.from("access_logs").select("*")
          .order("created_at", { ascending: false }).limit(200),
        supabase.from("member_access_logs").select("*")
          .order("created_at", { ascending: false }).limit(200),
        supabase.from("applications").select("*")
          .order("created_at", { ascending: false }).limit(100),
        supabase.from("clan_member_applications").select("*")
          .order("created_at", { ascending: false }).limit(100)
      ]);

    if (accessLogs.error && memberLogs.error) {
      renderError(logs, "Login logs could not be loaded.", accessLogs.error);
    } else {
      renderLoginLogs([
        ...(accessLogs.data || []),
        ...(memberLogs.data || [])
      ].sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      ));
    }

    if (staffApplications.error && clanApplications.error) {
      renderError(
        applications,
        "Applications could not be loaded.",
        staffApplications.error
      );
    } else {
      renderApplications([
        ...(staffApplications.data || []).map(row => ({
          ...row,
          application_type: "staff"
        })),
        ...(clanApplications.data || []).map(row => ({
          ...row,
          application_type: "clan"
        }))
      ].sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      ));
    }
  } catch (error) {
    renderError(logs, "Login logs could not be loaded.", error);
    renderError(applications, "Applications could not be loaded.", error);
  }
}

async function createClanMemberFromApplication(application, supabase) {
  const username = String(application.username || "").trim();

  if (!username) {
    throw new Error("The application has no username.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("clan_members")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    throw new Error("An account with this username already exists.");
  }

  const member = {
    username,
    password_hash: application.password_hash || null,
    email: application.email || null,
    age: application.age || null,
    country: application.country || null,
    timezone: application.timezone || null,
    discord_tag: application.discord_tag || null,
    avatar_url: application.avatar_url || null,
    game: application.game || "Minecraft Java",
    rank: application.rank || "BVR",
    staff_rank: "N/A",
    is_staff: false
  };

  const { data, error: insertError } = await supabase
    .from("clan_members")
    .insert(member)
    .select("id, username")
    .single();

  if (insertError) throw insertError;

  if (!data?.id) {
    throw new Error("Supabase did not confirm account creation.");
  }

  return data;
}

async function deleteApplication(button) {
  const table = button.dataset.applicationTable;
  const id = button.dataset.applicationId;
  const decision = button.dataset.applicationStatus;
  const card = button.closest(".application-card");

  if (!table || !id || !decision) return;

  const buttons = card?.querySelectorAll("button") || [];
  buttons.forEach(item => item.disabled = true);

  button.textContent = decision === "Approved"
    ? "Creating Account..."
    : "Denying...";

  try {
    const supabase = await getSupabase();

    const { data: application, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!application) throw new Error("Application could not be found.");

    if (decision === "Approved" && table === "clan_member_applications") {
      const account = await createClanMemberFromApplication(
        application,
        supabase
      );

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      console.info(`Created clan account for ${account.username}.`);
    } else {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    }

    await loadStaffData();
  } catch (error) {
    buttons.forEach(item => item.disabled = false);
    button.textContent = decision === "Approved"
      ? "Accept & Create Account"
      : "Deny & Delete";

    const notice = document.createElement("p");
    notice.className = "muted";
    notice.textContent = `Could not complete action: ${error.message}`;
    card?.appendChild(notice);
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-application-status]");
  if (button) deleteApplication(button);
});

addApplicationStyles();
loadStaffData();
setInterval(loadStaffData, 5000);
