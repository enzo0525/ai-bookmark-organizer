document.addEventListener("DOMContentLoaded", function () {
  const radioOptions = document.querySelectorAll(".radio-option");
  const radioInputs = document.querySelectorAll(
    'input[name="organizationType"]'
  );
  const nextBtn = document.getElementById("nextBtn");
  const closeBtn = document.getElementById("closeBtn");

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

      // Enable next button
      nextBtn.disabled = false;
    });
  });

  // Handle radio input changes (for keyboard navigation)
  radioInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (this.checked) {
        radioOptions.forEach((opt) => opt.classList.remove("selected"));
        const option = document.querySelector(`[data-value="${this.value}"]`);
        option.classList.add("selected");
        nextBtn.disabled = false;
      }
    });
  });

  // Handle continue button
  nextBtn.addEventListener("click", function () {
    const selectedType = document.querySelector(
      'input[name="organizationType"]:checked'
    ).value;
    console.log("Selected organization type:", selectedType);

    // Show loading state
    document.getElementById("loadingState").style.display = "flex";
    document.getElementById("nextBtn").disabled = true;

    // Send message to background.js
    console.log("Sending message to background script...");
    chrome.runtime.sendMessage(
      {
        action: "organizeBookmarks",
        organizationType: selectedType,
      },
      (response) => {
        console.log("Received response from background script:", response);
        console.log("Runtime error:", chrome.runtime.lastError);

        // Handle response from background script
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          // Show error message
          document.getElementById("loadingState").innerHTML = `
          <div style="text-align: center; margin-top: 20px;">
            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
            <p style="font-size: 16px; font-weight: 500; margin: 8px 0;">Connection Error</p>
            <p style="font-size: 14px; opacity: 0.7;">Please try again</p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Try Again</button>
          </div>
        `;
          return;
        }

        if (response && response.success) {
          // Show success message
          document.getElementById("loadingState").innerHTML = `
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
          // Show error message
          const errorMsg =
            response && response.error
              ? response.error
              : "Unknown error occurred";
          document.getElementById("loadingState").innerHTML = `
          <div class="loading-content">
            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
            <p style="font-size: 16px; font-weight: 500; margin: 8px 0;">Something went wrong</p>
            <p style="font-size: 14px; opacity: 0.7;">${errorMsg}</p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Try Again</button>
          </div>
        `;
        }
      }
    );
  });
});
