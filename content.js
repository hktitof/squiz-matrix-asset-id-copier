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

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => document.body.removeChild(notification), 500);
  }, 2000);
}

// Listen for Command + Shift + C (Mac) or Ctrl + Shift + C (Windows)
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyC") {
    findSelectedAsset();
    event.preventDefault(); // Prevent default shortcut behavior
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
    sendResponse({ status: "active" });
  }
  return true;
});

// Indicate extension is active
console.log("Squiz Matrix Asset ID Copier is active on this page");
