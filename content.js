(function () {
  // Check if the script is running in an iframe
  if (window !== window.top) {
    if (!isSquizMatrixAdmin(window.location.href)) return;
  }

  // Store the current shortcut
  let currentShortcut = "";
  const DEFAULT_MAC_SHORTCUT = "Command+Shift+C";
  const DEFAULT_WINDOWS_SHORTCUT = "Ctrl+Shift+C";
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // Load the saved shortcut
  chrome.storage.local.get(["keyboardShortcut"], function (result) {
    currentShortcut = result.keyboardShortcut || (isMac ? DEFAULT_MAC_SHORTCUT : DEFAULT_WINDOWS_SHORTCUT);
    console.log("Loaded shortcut: " + currentShortcut);
  });

  // Function to find and copy the selected asset ID
  function findSelectedAsset() {
    const selectedElement = document.querySelector(".selected.caret");
    if (selectedElement) {
      const assetId = selectedElement.getAttribute("data-assetid");
      if (assetId) {
        navigator.clipboard
          .writeText(assetId)
          .then(() => {
            // Show success notification
            showNotification("Asset ID " + assetId + " copied!");
          })
          .catch(() => {
            console.error("❌ Failed to copy asset ID.");
            showNotification("Failed to copy asset ID", true);
          });
      } else {
        showNotification("No asset ID found on selected element", true);
      }
    } else {
      showNotification("No asset selected", true);
    }
  }

  // Function to show a temporary notification
  function showNotification(message, isError = false) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.top = "10px";
    notification.style.right = "10px";
    notification.style.padding = "8px 16px";
    notification.style.borderRadius = "4px";
    notification.style.zIndex = "9999";
    notification.style.fontSize = "14px";
    notification.style.backgroundColor = isError ? "#f44336" : "#4CAF50";
    notification.style.color = "white";
    notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

    document.body.appendChild(notification);

    // Fade out and remove notification after 2 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s";
      setTimeout(() => document.body.removeChild(notification), 500);
    }, 2000);
  }

  // Parse a shortcut string into its components
  function parseShortcut(shortcutStr) {
    const keys = shortcutStr.split("+");
    return {
      ctrl: keys.includes("Ctrl"),
      shift: keys.includes("Shift"),
      alt: keys.includes("Alt"),
      meta: keys.includes("Command"),
      key: keys.find(k => !["Ctrl", "Shift", "Alt", "Command"].includes(k)),
    };
  }

  // Check if event matches the current shortcut
  function matchesShortcut(event, shortcutStr) {
    if (!shortcutStr) return false;

    const shortcut = parseShortcut(shortcutStr);

    // Check modifiers
    if (shortcut.ctrl !== event.ctrlKey) return false;
    if (shortcut.shift !== event.shiftKey) return false;
    if (shortcut.alt !== event.altKey) return false;
    if (shortcut.meta !== event.metaKey) return false;

    // Check key
    if (shortcut.key) {
      // Handle function keys
      if (shortcut.key.startsWith("F") && !isNaN(shortcut.key.substring(1))) {
        return event.key === shortcut.key;
      }

      // Handle letter keys (case insensitive)
      if (shortcut.key.length === 1) {
        return event.key.toUpperCase() === shortcut.key.toUpperCase();
      }

      // Handle other keys
      return (
        event.code === "Key" + shortcut.key || event.code === "Digit" + shortcut.key || event.code === shortcut.key
      );
    }

    return false;
  }

  // Listen for keyboard events
  document.addEventListener(
    "keydown",
    event => {
      // If matches current shortcut
      if (matchesShortcut(event, currentShortcut)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        findSelectedAsset();
      }
    },
    true
  ); // ← Capture phase ensures priority

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ status: "active" });
    }

    // Handle shortcut update
    if (message.action === "updateShortcut" && message.shortcut) {
      currentShortcut = message.shortcut;
      console.log("Updated shortcut to: " + currentShortcut);
    }

    // Handle the copy command
    if (message.command === "copy-asset-id") {
      findSelectedAsset();
    }

    return true;
  });

  // Indicate extension is active
  console.log("Squiz Matrix Asset ID Copier is active on this page");
})();

//This function checks if a given URL is an admin page of Squiz Matrix
//It takes a URL as a parameter
function isSquizMatrixAdmin(url) {
  //If the URL is not provided, return false
  if (!url) return false;
  //Convert the URL to lowercase
  const lowerUrl = url.toLowerCase();
  //Define an array of admin page patterns
  const patterns = ["/_admin", "/_admin/", "/_admin?", "/_admin#"];
  //Check if the URL contains any of the admin page patterns
  return patterns.some(pattern => lowerUrl.includes(pattern));
}
