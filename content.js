// Function to find and copy the selected asset ID
function findSelectedAsset() {
    const selectedElement = document.querySelector(".selected.caret");
    if (selectedElement) {
        const assetId = selectedElement.getAttribute("data-assetid");

        // Copy to clipboard
        navigator.clipboard.writeText(assetId).catch(() => {
            console.error("❌ Failed to copy asset ID.");
        });
    }
}

// Listen for Command + Shift + C (Mac) or Ctrl + Shift + C (Windows)
document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyC") {
        const selectedElement = document.querySelector(".selected.caret");
        if (selectedElement) {
            findSelectedAsset();
            event.preventDefault(); // Prevent default shortcut behavior
        }
    }
});
