function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getSearchableItems(container) {
  return Array.from(container.children).filter(child => {
    return !child.matches("[data-search-empty]");
  });
}

function applySearch(input) {
  const query = normalize(input.value);
  const selectors = input.dataset.staffSearch.split(",").map(item => item.trim()).filter(Boolean);
  let visibleCount = 0;
  let totalCount = 0;

  selectors.forEach(selector => {
    const container = document.querySelector(selector);
    if (!container) return;

    const items = getSearchableItems(container);
    totalCount += items.length;

    items.forEach(item => {
      const match = !query || normalize(item.textContent).includes(query);
      item.classList.toggle("search-hidden", !match);
      if (match) visibleCount += 1;
    });

    let empty = container.nextElementSibling;
    if (!empty || empty.dataset.searchEmpty !== selector) {
      empty = document.createElement("div");
      empty.className = "empty-state staff-search-empty hidden";
      empty.dataset.searchEmpty = selector;
      empty.textContent = "No matching results.";
      container.after(empty);
    }

    empty.classList.toggle("hidden", !query || visibleCount > 0 || totalCount === 0);
  });
}

function installStaffSearch() {
  document.querySelectorAll("[data-staff-search]").forEach(input => {
    if (input.dataset.searchInstalled) return;

    input.dataset.searchInstalled = "true";
    input.addEventListener("input", () => applySearch(input));

    input.dataset.staffSearch.split(",").map(item => item.trim()).filter(Boolean).forEach(selector => {
      const container = document.querySelector(selector);
      if (!container) return;

      new MutationObserver(() => applySearch(input)).observe(container, {
        childList: true,
        subtree: true
      });
    });

    applySearch(input);
  });
}

installStaffSearch();

window.addEventListener("staffSearchRefresh", installStaffSearch);
