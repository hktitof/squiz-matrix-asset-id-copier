chrome.action.onClicked.addListener(async tab => {
  const hasPermission = await chrome.permissions.contains({
    origins: ["*://*/*_admin*"],
  });

  if (!hasPermission) {
    const granted = await chrome.permissions.request({
      origins: ["*://*/*_admin*"],
    });

    if (!granted) {
      console.warn("❌ Permission denied for _admin pages.");
      return;
    }
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["content.js"],
  });
});
