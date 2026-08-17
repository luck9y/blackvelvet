import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
const AUTH_STORAGE_KEY = "black-velvet-supabase-auth";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: window.localStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const form = document.getElementById("announcementForm");
const titleInput = document.getElementById("announcementTitle");
const messageInput = document.getElementById("announcementMessage");
const authorInput = document.getElementById("announcementAuthor");
const submitButton = document.getElementById(
  "publishAnnouncementButton"
);
const statusMessage = document.getElementById("announcementStatus");
const actions = form?.querySelector(".announcement-actions");

let profile = null;

try {
  profile = JSON.parse(
    localStorage.getItem("blackVelvetProfile") || "null"
  );
} catch {
  profile = null;
}

if (titleInput) {
  titleInput.placeholder = "Black velvet ideas";
}

if (authorInput) {
  authorInput.placeholder = "Announcer User";

  const authorLabel =
    document.querySelector(`label[for="${authorInput.id}"]`) ||
    authorInput.closest("label");

  if (authorLabel) {
    const labelTextElement = authorLabel.querySelector(
      ":scope > span:first-child"
    );

    if (labelTextElement) {
      labelTextElement.textContent = "Username";
    } else {
      const labelTextNode = Array.from(authorLabel.childNodes).find(
        node =>
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim()
      );

      if (labelTextNode) {
        labelTextNode.textContent = "Username";
      }
    }
  }
}

if (authorInput && profile?.username) {
  authorInput.value =
    profile.discord_username || profile.username;
}

function addAttachmentFields() {
  if (
    !form ||
    !actions ||
    document.getElementById("announcementFile")
  ) {
    return;
  }

  const fields = document.createElement("div");
  fields.className = "announcement-media-fields";
  fields.innerHTML = `
    <label class="announcement-field announcement-link-name-field">
      <span>Link name</span>
      <input
        id="announcementLinkName"
        name="linkName"
        type="text"
        maxlength="100"
        placeholder="BLACK VELVET"
        autocomplete="off"
      >
    </label>

    <label class="announcement-field announcement-link-url-field">
      <span>Link URL</span>
      <input
        id="announcementLink"
        name="link"
        type="url"
        maxlength="500"
        placeholder="https://blackvelvet.team"
        autocomplete="off"
      >
    </label>

    <div class="announcement-field announcement-file-field">
      <span>Image or video</span>

      <div class="announcement-file-control">
        <input
          id="announcementFile"
          name="file"
          type="file"
          accept="image/*,video/*"
        >
        <label
          for="announcementFile"
          class="announcement-choose-file"
        >
          Choose file
        </label>
        <span
          id="announcementFileName"
          class="announcement-file-name"
        >
          No file selected
        </span>
      </div>

      <button
        id="removeAnnouncementFile"
        type="button"
        aria-label="Remove selected file"
        hidden
      >
        Remove
      </button>
    </div>
  `;

  form.insertBefore(fields, actions);

  const fileInput = fields.querySelector("#announcementFile");
  const fileName = fields.querySelector("#announcementFileName");
  const removeFileButton = fields.querySelector(
    "#removeAnnouncementFile"
  );

  function clearSelectedFile() {
    if (fileInput) {
      fileInput.value = "";
    }

    if (fileName) {
      fileName.textContent = "No file selected";
      fileName.title = "";
    }

    if (removeFileButton) {
      removeFileButton.hidden = true;
    }
  }

  fileInput?.addEventListener("change", () => {
    const selectedFile = fileInput.files?.[0] || null;

    if (fileName) {
      fileName.textContent =
        selectedFile?.name || "No file selected";
      fileName.title = selectedFile?.name || "";
    }

    if (removeFileButton) {
      removeFileButton.hidden = !selectedFile;
    }
  });

  removeFileButton?.addEventListener("click", clearSelectedFile);

  const style = document.createElement("style");
  style.textContent = `
    #announcementForm {
      gap: 10px !important;
    }

    #announcementForm label {
      gap: 4px !important;
    }

    #announcementMessage {
      min-height: 75px !important;
      height: 75px;
      resize: vertical;
    }

    #announcementForm input,
    #announcementForm textarea {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }

    .announcement-media-fields {
      display: grid;
      grid-template-columns:
        minmax(110px, 0.7fr)
        minmax(180px, 1.3fr)
        minmax(220px, 1fr);
      align-items: start;
      grid-column: 1 / -1;
      gap: 8px;
      width: 100%;
      min-width: 0;
      margin: 0;
    }

    .announcement-field {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      width: 100%;
      min-width: 0;
      margin: 0;
    }

    .announcement-field > span:first-child {
      display: block;
      box-sizing: border-box;
      height: 18px;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 18px;
      text-align: center;
    }

    .announcement-media-fields input:not([type="file"]),
    .announcement-file-control {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      height: 36px !important;
      min-height: 36px !important;
      max-height: 36px !important;
      margin: 0 !important;
      font-size: 12px;
    }

    .announcement-media-fields input:not([type="file"]) {
      padding: 7px 9px !important;
    }

    .announcement-file-control {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      padding: 7px 9px;
      border: 1px solid #454d56;
      border-radius: 5px;
      background: #252b31;
    }

    #announcementFile {
      position: absolute;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden;
      padding: 0 !important;
      margin: -1px;
      border: 0;
      opacity: 0;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }

    .announcement-choose-file {
      flex: 0 0 auto;
      display: inline-flex !important;
      align-items: center;
      height: auto;
      margin: 0 !important;
      padding: 0 !important;
      color: #e7eaed;
      font-size: 12px;
      line-height: 1;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    .announcement-choose-file:hover {
      color: #ffffff;
    }

    .announcement-choose-file:focus-within {
      outline: 2px solid #788694;
      outline-offset: 2px;
    }

    .announcement-file-name {
      min-width: 0;
      overflow: hidden;
      margin: 0;
      padding: 0;
      color: #aab1b8;
      font-size: 11px;
      line-height: 1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #removeAnnouncementFile {
      align-self: flex-start;
      width: auto;
      min-width: 0;
      height: auto;
      margin: 0;
      padding: 1px 0 0;
      border: 0;
      border-radius: 0;
      color: #ef626c;
      background: transparent;
      box-shadow: none;
      font: inherit;
      font-size: 10px;
      line-height: 1.2;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }

    #removeAnnouncementFile:hover {
      color: #ff8189;
      background: transparent;
    }

    #removeAnnouncementFile[hidden] {
      display: none !important;
    }

    .announcement-actions {
      grid-column: 1 / -1;
      order: 999;
      width: 100%;
      margin-top: 2px !important;
    }

    #announcementStatus:empty {
      display: none;
    }

    @media (max-width: 800px) {
      .announcement-media-fields {
        grid-template-columns:
          minmax(100px, 0.7fr)
          minmax(160px, 1.3fr);
      }

      .announcement-file-field {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 520px) {
      .announcement-media-fields {
        grid-template-columns: 1fr;
      }

      .announcement-file-field {
        grid-column: auto;
      }
    }
  `;

  document.head.appendChild(style);
}

function setStatus(message, type = "") {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className =
    `announcement-status ${type}`.trim();
}

function isAllowedFile(file) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/")
  );
}

async function getErrorMessage(response) {
  try {
    const result = await response.json();
    return result?.error || result?.message || "";
  } catch {
    return "";
  }
}

async function getActiveSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Session check failed: ${error.message}`);
  }

  if (!session) {
    return null;
  }

  const expiresSoon =
    Number(session.expires_at || 0) * 1000 <
    Date.now() + 60_000;

  if (!expiresSoon) {
    return session;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError
  } = await supabase.auth.refreshSession();

  if (refreshError) {
    await supabase.auth.signOut();
    return null;
  }

  return refreshedSession;
}

function redirectToLogin() {
  sessionStorage.setItem(
    "blackVelvetLoginReturnTo",
    location.href
  );

  window.location.href = "member-login.html";
}

addAttachmentFields();

form?.addEventListener("submit", async event => {
  event.preventDefault();

  const fileInput = document.getElementById("announcementFile");
  const fileName = document.getElementById("announcementFileName");
  const linkInput = document.getElementById("announcementLink");
  const linkNameInput = document.getElementById(
    "announcementLinkName"
  );
  const removeFileButton = document.getElementById(
    "removeAnnouncementFile"
  );

  const title = titleInput.value.trim();
  const message = messageInput.value.trim();
  const discordUsername = authorInput.value.trim();
  const link = linkInput?.value.trim() || "";
  const linkName = linkNameInput?.value.trim() || "";
  const file = fileInput?.files?.[0] || null;

  if (!title || !message || !discordUsername) {
    setStatus(
      "Complete every required announcement field.",
      "error"
    );
    return;
  }

  if (link) {
    try {
      const parsedLink = new URL(link);

      if (!["http:", "https:"].includes(parsedLink.protocol)) {
        throw new Error();
      }
    } catch {
      setStatus("Enter a valid HTTP or HTTPS link.", "error");
      return;
    }
  }

  if (linkName && !link) {
    setStatus(
      "Enter a link when providing a link name.",
      "error"
    );
    return;
  }

  if (file && !isAllowedFile(file)) {
    setStatus(
      "Only image and video attachments are supported.",
      "error"
    );
    return;
  }

  if (file && file.size > MAX_FILE_SIZE) {
    setStatus(
      "The attachment must be 10 MB or smaller.",
      "error"
    );
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Publishing...";
  setStatus("Checking staff session...", "pending");

  try {
    const session = await getActiveSession();

    if (!session?.access_token) {
      setStatus(
        "A Supabase login is required. Redirecting to login...",
        "error"
      );

      setTimeout(redirectToLogin, 900);
      return;
    }

    setStatus("Sending announcement...", "pending");

    const body = new FormData();
    body.append("title", title);
    body.append("message", message);
    body.append("discordUsername", discordUsername);

    if (link) {
      body.append("link", link);
    }

    if (linkName) {
      body.append("linkName", linkName);
    }

    if (file) {
      body.append("file", file, file.name);
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/publish-announcement`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body
      }
    );

    if (!response.ok) {
      const detail = await getErrorMessage(response);

      if (response.status === 401) {
        await supabase.auth.signOut();

        throw new Error(
          "Your Supabase session expired. Sign in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          detail ||
          "This Supabase account is not listed as a staff user."
        );
      }

      if (response.status === 404) {
        throw new Error(
          "The publish-announcement Edge Function has not been deployed."
        );
      }

      throw new Error(
        detail ||
        `Publishing failed with status ${response.status}.`
      );
    }

    const result = await response.json();

    if (!result?.success) {
      throw new Error(
        result?.error || "The announcement was not published."
      );
    }

    form.reset();

    if (fileName) {
      fileName.textContent = "No file selected";
      fileName.title = "";
    }

    if (removeFileButton) {
      removeFileButton.hidden = true;
    }

    if (profile?.username) {
      authorInput.value =
        profile.discord_username || profile.username;
    }

    setStatus(
      "Announcement published to the website and Discord.",
      "success"
    );

    window.dispatchEvent(
      new CustomEvent("blackVelvetAnnouncementPublished", {
        detail: result.announcement || null
      })
    );
  } catch (error) {
    console.error("Announcement publish failed:", error);

    setStatus(
      error?.message ||
      "Publishing failed. Check the Edge Function and staff session.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Publish Announcement";
  }
});
