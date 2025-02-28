// Helper function to detect Squiz Matrix admin URLs more reliably
function isSquizMatrixAdmin(url) {
  if (!url) return false;

  // Convert to lowercase for case-insensitive matching
  const lowerUrl = url.toLowerCase();

  // Check for the _admin pattern in different positions
  const patterns = ["/_admin", "/_admin/", "/_admin?", "/_admin#"];

  for (const pattern of patterns) {
    if (lowerUrl.includes(pattern)) {
      return true;
    }
  }

  return false;
}

// Add an event listener for when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Get the current allowed domains and show notifications preferences from storage
  chrome.storage.local.get(["allowedDomains", "showNotifications"], function (result) {
    // If allowed domains are not set, set them to an empty array
    if (!result.allowedDomains) {
      chrome.storage.local.set({ allowedDomains: [] });
    }

    // Initialize notification preference if not set
    if (result.showNotifications === undefined) {
      chrome.storage.local.set({ showNotifications: true });
    }
  });

  // Log that extension was installed
  console.log("Squiz Matrix Asset ID Copier extension installed");
});

// Log URL information for debugging
chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    // Add error check here
    if (chrome.runtime.lastError) {
      console.warn("Tab error:", chrome.runtime.lastError);
      return;
    }
    if (tab.url) {
      console.log("Is Squiz Matrix admin: " + isSquizMatrixAdmin(tab.url));
    }
  });
});

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["allowedDomains"], function (result) {
    if (!result.allowedDomains) {
      chrome.storage.local.set({ allowedDomains: [] });
    }
  });

  // Log that extension was installed
  console.log("Squiz Matrix Asset ID Copier extension installed");
});

// Clean up all storage when extension is uninstalled
chrome.runtime.onSuspend.addListener(() => {
  // Clear all local storage
  chrome.storage.local.clear(() => {
    console.log("All extension storage data cleared");
  });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkIfAdmin") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].url) {
        sendResponse({
          isAdmin: isSquizMatrixAdmin(tabs[0].url),
          url: tabs[0].url,
        });
      } else {
        sendResponse({ isAdmin: false, url: null });
      }
    });
    return true; // Indicate async response
  }
});
