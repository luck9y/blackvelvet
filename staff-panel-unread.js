import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const panels = {
  loginLogs: {
    badge: "logCount",
    tables: ["access_logs", "member_access_logs"]
  },
  applications: {
    badge: "applicationCount",
    tables: ["applications", "clan_member_applications"]
  },
  systemConsole: {
    badge: "consoleCount",
    tables: []
  }
};

function addApplicationStyles() {
  if (document.getElementById("compact-application-styles")) return;

  const style = document.createElement("style");
  style.id = "compact-application-styles";
  style.textContent = `
    #applicationsList.application-list {
      gap: 7px;
    }

    #applicationsList .application-card {
      padding: 11px 13px;
      border-color: #3b4249;
      border-radius: 6px;
      color: #aeb5bb;
      background: linear-gradient(135deg, #20252a, #15181b);
      box-shadow: none;
      line-height: 1.35;
    }

    #applicationsList .application-card:hover {
      border-color: #59626b;
      background: linear-gradient(135deg, #252b30, #191d21);
    }

    #applicationsList .application-card h3,
    #applicationsList .application-card h4,
    #applicationsList .application-card strong {
      margin: 0 0 4px;
      color: #d0d5d9;
      font-size: 14px;
      line-height: 1.25;
    }

    #applicationsList .application-card p {
      margin: 3px 0;
      color: #9da5ac;
      font-size: 12px;
      line-height: 1.35;
    }

    #applicationsList .application-card small,
    #applicationsList .application-card time,
    #applicationsList .application-card .muted {
      color: #7f8991;
      font-size: 11px;
      line-height: 1.25;
    }

    #applicationsList .application-card ul {
      margin: 5px 0;
      padding-left: 18px;
    }

    #applicationsList .application-card li {
      margin: 2px 0;
      color: #aeb5bb;
      font-size: 12px;
      line-height: 1.3;
    }

    #applicationsList .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    #applicationsList .card-actions button {
      padding: 6px 9px;
      border-color: #505860;
      color: #c5cbd0;
      background: #292f34;
      font-size: 11px;
    }

    #applicationsList .empty-state {
      padding: 18px;
    }
  `;

  document.head.appendChild(style);
}

function username() {
  try {
    return JSON.parse(
      localStorage.getItem("blackVelvetProfile") || "null"
    )?.username || "unknown";
  } catch {
    return "unknown";
  }
}

function readKey(panel) {
  return `blackVelvetPanelRead:${username()}:${panel}`;
}

function getReadTime(panel) {
  return Number(localStorage.getItem(readKey(panel)) || 0);
}

function setBadge(id, value) {
  const badge = document.getElementById(id);
  if (badge) badge.textContent = String(value);
}

function markPanelRead(panel) {
  localStorage.setItem(readKey(panel), String(Date.now()));
  setBadge(panels[panel].badge, 0);
}

async function countUnread(panel) {
  const config = panels[panel];
  if (!config) return;

  if (panel === "systemConsole") return;

  const readAt = getReadTime(panel);
  let total = 0;

  for (const table of config.tables) {
    const { data, error } = await supabase
      .from(table)
      .select("created_at")
      .gt("created_at", new Date(readAt).toISOString());

    if (!error) total += data?.length || 0;
  }

  setBadge(config.badge, total);
}

function refreshAll() {
  Object.keys(panels).forEach(countUnread);
}

addApplicationStyles();

document.addEventListener("click", event => {
  const button = event.target.closest(".nav-button[data-panel]");
  if (!button) return;

  const panel = button.dataset.panel;
  if (!panels[panel]) return;

  markPanelRead(panel);

  if (panel === "systemConsole") {
    localStorage.setItem(readKey(panel), String(Date.now()));
    setBadge("consoleCount", 0);
  }
});

document.querySelectorAll(".nav-button[data-panel]").forEach(button => {
  if (
    button.dataset.panel !== "loginLogs" &&
    button.dataset.panel !== "applications" &&
    button.dataset.panel !== "systemConsole"
  ) {
    return;
  }

  button.addEventListener("click", () => {
    const panel = document.getElementById(button.dataset.panel);

    if (panel?.classList.contains("active-panel")) {
      markPanelRead(button.dataset.panel);
    }
  });
});

[
  "access_logs",
  "member_access_logs",
  "applications",
  "clan_member_applications"
].forEach(table => {
  supabase
    .channel(`panel-unread-${table}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table
      },
      refreshAll
    )
    .subscribe();
});

const consoleList = document.getElementById("consoleList");

if (consoleList) {
  let consoleWasRead = false;

  const observer = new MutationObserver(() => {
    const count = consoleList.children.length;

    if (count > 0 && !consoleWasRead) {
      setBadge("consoleCount", 1);
    }
  });

  observer.observe(consoleList, {
    childList: true,
    subtree: true
  });

  document
    .querySelector('[data-panel="systemConsole"]')
    ?.addEventListener("click", () => {
      consoleWasRead = true;
      setBadge("consoleCount", 0);
    });
}

refreshAll();
