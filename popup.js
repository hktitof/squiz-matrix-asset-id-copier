document.addEventListener("DOMContentLoaded", function () {
  const adminPageEl = document.getElementById("admin-page");
  const notAdminPageEl = document.getElementById("not-admin-page");
  const permissionRequiredEl = document.getElementById("permission-required");
  const loadingEl = document.getElementById("loading");
  const grantPermissionBtn = document.getElementById("grant-permission");
  const shortcutInput = document.getElementById("shortcut-input");
  const saveShortcutBtn = document.getElementById("save-shortcut");
  const resetShortcutBtn = document.getElementById("reset-shortcut");
  const platformDefaultEl = document.getElementById("platform-default");
  const defaultShortcutEl = document.getElementById("default-shortcut");

  // Default shortcuts
  const MAC_DEFAULT = "Command+Shift+C";
  const WINDOWS_DEFAULT = "Ctrl+Shift+C";

  // Detect platform
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const defaultShortcut = isMac ? MAC_DEFAULT : WINDOWS_DEFAULT;
  const modifierKey = isMac ? "Command" : "Ctrl";

  // Update UI with platform-specific text
  platformDefaultEl.textContent = defaultShortcut;
  defaultShortcutEl.textContent = modifierKey;

  function addDebugInfo(msg) {
    console.log("Debug: " + msg);
    // Optional: Add visible debug info to popup
    const debugElement = document.createElement("div");
    debugElement.style.fontSize = "10px";
    debugElement.style.color = "gray";
    debugElement.style.marginTop = "4px";
    debugElement.textContent = msg;
    document.querySelector(".footer").appendChild(debugElement);
  }

  // Load current shortcut
  function loadCurrentShortcut() {
    chrome.storage.local.get(["keyboardShortcut"], function (result) {
      if (result.keyboardShortcut) {
        shortcutInput.value = result.keyboardShortcut;
      } else {
        shortcutInput.value = defaultShortcut;
        // Save default shortcut if none exists
        chrome.storage.local.set({ keyboardShortcut: defaultShortcut });
      }
    });
  }

  // Shortcut input handling
  shortcutInput.addEventListener("keydown", function (e) {
    e.preventDefault();

    const keys = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.shiftKey) keys.push("Shift");
    if (e.altKey) keys.push("Alt");
    if (e.metaKey) keys.push("Command");

    // Add the pressed key if it's not a modifier
    if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      // Convert key name to a more readable format
      const keyName = e.code.replace("Key", "").replace("Digit", "");
      keys.push(keyName);
    }

    if (keys.length > 0) {
      shortcutInput.value = keys.join("+");
    }

    // Check for potentially risky shortcuts
    checkRiskyShortcut(shortcutInput.value);
  });

  // Check if shortcut might override browser functionality
  function checkRiskyShortcut(shortcut) {
    const riskyShortcuts = [
      "F12",
      "Ctrl+Shift+I",
      "Command+Option+I", // Developer tools
      "Ctrl+Shift+C",
      "Command+Shift+C", // Element inspector
      "Ctrl+U",
      "Command+Option+U", // View source
      "Ctrl+F",
      "Command+F", // Find
      "Ctrl+T",
      "Command+T", // New tab
    ];

    if (riskyShortcuts.includes(shortcut)) {
      addDebugInfo("Warning: This shortcut may override browser functionality");
      showWarningNotification("This shortcut may override browser functionality");
    }
  }

  function showWarningNotification(message) {
    const container = document.querySelector(".shortcut-container");

    // Remove any existing notification
    const existingNotification = document.querySelector(".alert-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = "alert alert-yellow alert-notification";
    notification.style.marginTop = "12px";

    const text = document.createElement("p");
    text.textContent = "⚠️ " + message;
    notification.appendChild(text);

    container.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Save shortcut button
  saveShortcutBtn.addEventListener("click", function () {
    const shortcut = shortcutInput.value;
    if (!shortcut) {
      showWarningNotification("Please set a valid shortcut");
      return;
    }

    chrome.storage.local.set({ keyboardShortcut: shortcut }, function () {
      const successNotification = document.createElement("div");
      successNotification.className = "alert alert-green alert-notification";
      successNotification.style.marginTop = "12px";

      const text = document.createElement("p");
      text.textContent = "✅ Shortcut saved successfully";
      successNotification.appendChild(text);

      const container = document.querySelector(".shortcut-container");
      container.appendChild(successNotification);

      // Remove after 3 seconds
      setTimeout(() => {
        successNotification.remove();
      }, 3000);

      // Notify content script of the shortcut change
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateShortcut",
            shortcut: shortcut,
          });
        }
      });
    });
  });

  // Reset shortcut button
  resetShortcutBtn.addEventListener("click", function () {
    shortcutInput.value = defaultShortcut;
    chrome.storage.local.set({ keyboardShortcut: defaultShortcut }, function () {
      addDebugInfo("Reset to default shortcut: " + defaultShortcut);

      // Notify content script of the shortcut change
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateShortcut",
            shortcut: defaultShortcut,
          });
        }
      });

      showWarningNotification("Shortcut reset to default: " + defaultShortcut);
    });
  });

  // Check if the current tab is a Squiz Matrix admin page using the background script
  chrome.runtime.sendMessage({ action: "checkIfAdmin" }, function (response) {
    loadingEl.classList.add("hidden");

    if (!response) {
      addDebugInfo("No response from background script");
      notAdminPageEl.classList.remove("hidden");
      return;
    }

    addDebugInfo("URL: " + (response.url || "unknown"));
    addDebugInfo("Is Admin Page: " + response.isAdmin);

    if (response.isAdmin) {
      // It's a Squiz Matrix admin page - check if content script is running
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || !tabs[0]) {
          addDebugInfo("No active tab found");
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, function (contentResponse) {
          if (chrome.runtime.lastError) {
            addDebugInfo("Content script not running: " + chrome.runtime.lastError.message);
            permissionRequiredEl.classList.remove("hidden");
          } else if (contentResponse && contentResponse.status === "active") {
            addDebugInfo("Content script is active");
            adminPageEl.classList.remove("hidden");
            loadCurrentShortcut();
          } else {
            addDebugInfo("Unknown content script state");
            permissionRequiredEl.classList.remove("hidden");
          }
        });
      });
    } else {
      // Not a Squiz Matrix admin page
      notAdminPageEl.classList.remove("hidden");
    }
  });

  // get the permissions info element
  const permissionsInfoEl = document.getElementById("permissions-info");

  // Handle permission grant button click
  grantPermissionBtn.addEventListener("click", function () {
    grantPermissionBtn.textContent = "Enabling...";
    grantPermissionBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        addDebugInfo("No active tab or URL");
        grantPermissionBtn.textContent = "Failed - Try again";
        grantPermissionBtn.disabled = false;
        return;
      }

      const origin = new URL(tabs[0].url).origin;
      addDebugInfo("Adding permission for: " + origin);

      // Add this domain to our allowed list
      chrome.storage.local.get(["allowedDomains"], function (result) {
        const allowedDomains = result.allowedDomains || [];
        if (!allowedDomains.includes(origin)) {
          allowedDomains.push(origin);
          chrome.storage.local.set({ allowedDomains: allowedDomains }, function () {
            addDebugInfo("Domain added. Reloading...");
            // Force injection of content script
            chrome.scripting
              .executeScript({
                target: { tabId: tabs[0].id, allFrames: true },
                files: ["content.js"],
              })
              .then(() => {
                // Hide both the permission required and permissions info sections
                permissionRequiredEl.classList.add("hidden");
                permissionsInfoEl.classList.add("hidden");
                adminPageEl.classList.remove("hidden");
                loadCurrentShortcut();
                addDebugInfo("Script injected successfully");
              })
              .catch(err => {
                addDebugInfo("Script injection error: " + err.message);
                grantPermissionBtn.textContent = "Failed - Try again";
                grantPermissionBtn.disabled = false;
              });
          });
        } else {
          addDebugInfo("Domain already in allowed list");
          chrome.scripting
            .executeScript({
              target: { tabId: tabs[0].id, allFrames: true },
              files: ["content.js"],
            })
            .then(() => {
              // Hide both the permission required and permissions info sections
              permissionRequiredEl.classList.add("hidden");
              permissionsInfoEl.classList.add("hidden");
              adminPageEl.classList.remove("hidden");
              loadCurrentShortcut();
              addDebugInfo("Script re-injected successfully");
            })
            .catch(err => {
              addDebugInfo("Script re-injection error: " + err.message);
            });
        }
      });
    });
  });
});
