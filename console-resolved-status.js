const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

const checkedColumns = new Map();

async function checkColumn(table, column) {
  const key = `${table}.${column}`;

  if (checkedColumns.has(key)) {
    return checkedColumns.get(key);
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=1`,
      { headers }
    );

    const exists = response.ok;
    checkedColumns.set(key, exists);
    return exists;
  } catch {
    checkedColumns.set(key, false);
    return false;
  }
}

function getDiagnosticDetails(text) {
  const match = String(text || "").match(
    /"([^"]+)" is missing from the "([^"]+)" table/i
  );

  if (!match) return null;

  return {
    column: match[1],
    table: match[2]
  };
}

async function updateResolvedStatuses() {
  const cards = document.querySelectorAll("#consoleList .console-error-card");

  for (const card of cards) {
    const status = card.querySelector(".log-status");
    if (!status) continue;

    const details = getDiagnosticDetails(status.textContent);
    if (!details) continue;

    const fixed = await checkColumn(details.table, details.column);

    card.classList.toggle("console-fixed-card", fixed);

    let badge = card.querySelector(".console-fixed-badge");

    if (fixed) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "console-fixed-badge";
        badge.textContent = "✓ FIXED";
        card.querySelector(".log-main")?.prepend(badge);
      }

      status.textContent =
        `${details.table}.${details.column} is now available in Supabase.`;
    } else if (badge) {
      badge.remove();
    }
  }
}

const consoleList = document.getElementById("consoleList");

if (consoleList) {
  const observer = new MutationObserver(() => {
    updateResolvedStatuses();
  });

  observer.observe(consoleList, {
    childList: true,
    subtree: true
  });

  setInterval(() => {
    checkedColumns.clear();
    updateResolvedStatuses();
  }, 10000);

  updateResolvedStatuses();
}
