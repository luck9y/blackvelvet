import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

if (!window.__blackVelvetErrorReporterInstalled) {
  window.__blackVelvetErrorReporterInstalled = true;

  const supabase = createClient(
    "https://ptgzhljvzyceawwohmym.supabase.co",
    "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
  );

  const originalConsoleError = console.error.bind(console);
  const originalFetch = window.fetch.bind(window);

  let queue = Promise.resolve();
  let lastSignature = "";
  let lastTime = 0;

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
    } catch {
      return null;
    }
  }

  function stringify(value) {
    if (value instanceof Error) return value.stack || value.message;

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  function shouldIgnore(message = "") {
    return String(message).includes("system_errors");
  }

  async function saveError(payload) {
    await supabase.from("system_errors").insert(payload);
  }

  function reportError(source, message, stack = "") {
    const text = String(message || "").trim();

    if (!text || shouldIgnore(text)) return;

    const signature = `${source}:${text}:${location.pathname}`;
    const now = Date.now();

    if (signature === lastSignature && now - lastTime < 2500) return;

    lastSignature = signature;
    lastTime = now;

    const profile = getProfile();

    const payload = {
      source,
      message: text.slice(0, 4000),
      stack_trace: String(stack || "").slice(0, 12000) || null,
      page_url: location.href,
      username: profile?.username || null,
      user_role: profile?.role || profile?.staffRank || null,
      device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
      browser: navigator.userAgent
    };

    queue = queue.then(() => saveError(payload)).catch(() => {});
  }

  window.BlackVelvetReportError = reportError;

  console.error = (...parts) => {
    originalConsoleError(...parts);

    const firstError = parts.find(part => part instanceof Error);

    reportError(
      "console.error",
      parts.map(stringify).join(" "),
      firstError?.stack || new Error().stack || ""
    );
  };

  window.addEventListener("error", event => {
    if (event.target && event.target !== window) {
      const target = event.target;
      const url = target.src || target.href || "unknown resource";

      reportError(
        "resource.error",
        `Failed to load ${target.tagName || "resource"}: ${url}`
      );

      return;
    }

    reportError(
      "window.error",
      event.error?.message || event.message || "Unknown browser error",
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    );
  }, true);

  window.addEventListener("unhandledrejection", event => {
    reportError(
      "unhandledrejection",
      stringify(event.reason || "Unhandled promise rejection"),
      event.reason?.stack || ""
    );
  });

  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (!response.ok && !url.includes("system_errors")) {
        reportError(
          "fetch.error",
          `${response.status} ${response.statusText} while requesting ${url || "unknown URL"}`
        );
      }

      return response;
    } catch (error) {
      reportError("fetch.exception", error.message, error.stack);
      throw error;
    }
  };
}
