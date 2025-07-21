document.addEventListener("DOMContentLoaded", function () {
  const radioOptions = document.querySelectorAll(".radio-option");
  const radioInputs = document.querySelectorAll(
    'input[name="organizationType"]'
  );
  const previewBtn = document.getElementById("previewBtn");
  const closeBtn = document.getElementById("closeBtn");
  const selectionView = document.getElementById("selectionView");
  const previewView = document.getElementById("previewView");
  const loadingState = document.getElementById("loadingState");
  const loadingText = document.getElementById("loadingText");
  const loadingSubtext = document.getElementById("loadingSubtext");
  const previewContent = document.getElementById("previewContent");
  const cancelBtn = document.getElementById("cancelBtn");
  const acceptBtn = document.getElementById("acceptBtn");

  let currentOrganizationStructure = null;

  // Handle close button
  closeBtn.addEventListener("click", function () {
    window.close();
  });

  // Handle radio option clicks
  radioOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const value = this.dataset.value;
      const radioInput = document.getElementById(value);

      // Update radio input
      radioInput.checked = true;

      // Update visual selection
      radioOptions.forEach((opt) => opt.classList.remove("selected"));
      this.classList.add("selected");

      // Enable preview button
      previewBtn.disabled = false;
    });
  });

  // Handle radio input changes (for keyboard navigation)
  radioInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (this.checked) {
        radioOptions.forEach((opt) => opt.classList.remove("selected"));
        const option = document.querySelector(`[data-value="${this.value}"]`);
        option.classList.add("selected");
        previewBtn.disabled = false;
      }
    });
  });

  // Handle preview button
  previewBtn.addEventListener("click", function () {
    const selectedType = document.querySelector(
      'input[name="organizationType"]:checked'
    ).value;
    console.log("Selected organization type:", selectedType);
    generatePreview(selectedType);
  });

  // Handle cancel button
  cancelBtn.addEventListener("click", function () {
    showSelectionView();
  });

  // Handle accept button
  acceptBtn.addEventListener("click", function () {
    executeOrganization();
  });

  function generatePreview(organizationType) {
    console.log("Generating preview for type:", organizationType);

    // Show loading state
    loadingText.textContent = "🤖 AI is analyzing your bookmarks...";
    loadingSubtext.textContent = "Generating organization preview";
    loadingState.style.display = "flex";

    // Send message to background.js
    chrome.runtime.sendMessage(
      {
        action: "generatePreview",
        organizationType: organizationType,
      },
      (response) => {
        console.log("Received preview response:", response);
        loadingState.style.display = "none";

        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          showError("Connection Error", "Please try again");
          return;
        }

        if (response && response.success) {
          currentOrganizationStructure = response.organizationStructure;
          showPreview(response.preview);
        } else {
          const errorMsg =
            response && response.error
              ? response.error
              : "Unknown error occurred";
          showError("Preview Generation Failed", errorMsg);
        }
      }
    );
  }

  function executeOrganization() {
    if (!currentOrganizationStructure) {
      showError("Error", "No organization structure available");
      return;
    }

    console.log("Executing organization");

    // Show loading state
    loadingText.textContent = "🚀 Organizing your bookmarks...";
    loadingSubtext.textContent = "This may take a few moments";
    loadingState.style.display = "flex";

    // Send message to background.js
    chrome.runtime.sendMessage(
      {
        action: "executeOrganization",
        organizationStructure: currentOrganizationStructure,
      },
      (response) => {
        console.log("Received execution response:", response);

        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          showError("Connection Error", "Please try again");
          return;
        }

        if (response && response.success) {
          // Show success message
          loadingState.innerHTML = `
            <div class="loading-content">
              <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
              <p style="font-size: 16px; font-weight: 500; margin: 8px 0;">Bookmarks organized successfully!</p>
              <p style="font-size: 14px; opacity: 0.7;">Your bookmarks have been organized by AI</p>
            </div>
          `;

          // Keep popup open for 3 seconds to show success message
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          const errorMsg =
            response && response.error
              ? response.error
              : "Unknown error occurred";
          showError("Organization Failed", errorMsg);
        }
      }
    );
  }

  function showPreview(previewData) {
    console.log("Showing preview:", previewData);

    // Generate preview HTML
    let previewHTML = "";

    // Show bookmark bar section
    if (previewData.bookmarkBar && previewData.bookmarkBar.length > 0) {
      previewHTML += `
        <div class="bookmark-bar-section">
          <div class="section-title">
            <span>📌</span>
            <span>Bookmark Bar (${previewData.bookmarkBar.length} items)</span>
          </div>
          <div class="bookmark-list">
            ${previewData.bookmarkBar
              .map(
                (bookmark) => `
              <div class="bookmark-item">
                <div class="bookmark-favicon"></div>
                <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                <div class="bookmark-domain">${escapeHtml(
                  bookmark.domain
                )}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    // Show folders section
    if (previewData.folders && previewData.folders.length > 0) {
      previewHTML += `
        <div class="folders-section">
          <div class="section-title">
            <span>📁</span>
            <span>Folders (${previewData.folders.length} folders)</span>
          </div>
          ${previewData.folders.map((folder) => renderFolder(folder)).join("")}
        </div>
      `;
    }

    if (!previewHTML) {
      previewHTML =
        '<div style="text-align: center; opacity: 0.7;">No bookmarks to organize</div>';
    }

    previewContent.innerHTML = previewHTML;
    showPreviewView();
  }

  function renderFolder(folder, isSubfolder = false) {
    const totalItems = folder.bookmarks.length + folder.subfolders.length;
    const containerClass = isSubfolder ? "subfolder" : "folder-item";

    return `
      <div class="${containerClass}">
        <div class="folder-name">
          ${escapeHtml(folder.name)} (${totalItems} items)
        </div>
        ${
          folder.bookmarks.length > 0
            ? `
          <div class="bookmark-list">
            ${folder.bookmarks
              .map(
                (bookmark) => `
              <div class="bookmark-item">
                <div class="bookmark-favicon"></div>
                <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                <div class="bookmark-domain">${escapeHtml(
                  bookmark.domain
                )}</div>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
        ${folder.subfolders
          .map((subfolder) => renderFolder(subfolder, true))
          .join("")}
      </div>
    `;
  }

  function showSelectionView() {
    selectionView.style.display = "block";
    previewView.style.display = "none";
    loadingState.style.display = "none";
    currentOrganizationStructure = null;
  }

  function showPreviewView() {
    selectionView.style.display = "none";
    previewView.style.display = "block";
    loadingState.style.display = "none";
  }

  function showError(title, message) {
    loadingState.innerHTML = `
      <div class="loading-content">
        <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
        <p style="font-size: 16px; font-weight: 500; margin: 8px 0;">${escapeHtml(
          title
        )}</p>
        <p style="font-size: 14px; opacity: 0.7;">${escapeHtml(message)}</p>
        <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Try Again</button>
      </div>
    `;
    loadingState.style.display = "flex";
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
