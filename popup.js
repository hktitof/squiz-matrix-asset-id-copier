document.addEventListener("DOMContentLoaded", function () {
  const adminPageEl = document.getElementById("admin-page");
  const notAdminPageEl = document.getElementById("not-admin-page");
  const permissionRequiredEl = document.getElementById("permission-required");
  const loadingEl = document.getElementById("loading");
  const grantPermissionBtn = document.getElementById("grant-permission");

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
                permissionRequiredEl.classList.add("hidden");
                adminPageEl.classList.remove("hidden");
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
              permissionRequiredEl.classList.add("hidden");
              adminPageEl.classList.remove("hidden");
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
