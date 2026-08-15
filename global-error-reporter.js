import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

if (!window.__blackVelvetErrorReporterInstalled) {
  window.__blackVelvetErrorReporterInstalled = true;

  const supabase = createClient(
    "https://ptgzhljvzyceawwohmym.supabase.co",
    "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
  );

  const originalConsoleError = console.error.bind(console);
  const originalFetch = window.fetch.bind(window);

  let saving = false;
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

  async function reportError(source, message, stack = "") {
    const text = String(message || "").trim();
    if (!text || text.includes("system_errors")) return;

    const signature = `${source}:${text}:${location.pathname}`;
    const now = Date.now();

    if (signature === lastSignature && now - lastTime < 3000) return;

    lastSignature = signature;
    lastTime = now;

    if (saving) return;
    saving = true;

    try {
      const profile = getProfile();

      await supabase.from("system_errors").insert({
        source,
        message: text.slice(0, 4000),
        stack_trace: String(stack || "").slice(0, 12000) || null,
        page_url: location.href,
        username: profile?.username || null,
        user_role: profile?.role || profile?.staffRank || null,
        device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
        browser: navigator.userAgent
      });
    } catch {
      // Avoid recursive logging.
    } finally {
      saving = false;
    }
  }

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
    reportError(
      "window.error",
      event.error?.message || event.message || "Unknown browser error",
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    );
  });

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

      if (!response.ok) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
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
