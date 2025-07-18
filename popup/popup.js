document.addEventListener("DOMContentLoaded", function () {
  const radioOptions = document.querySelectorAll(".radio-option");
  const radioInputs = document.querySelectorAll(
    'input[name="organizationType"]'
  );
  const nextBtn = document.getElementById("nextBtn");

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

    // Send message to background.js
    chrome.runtime.sendMessage({
      action: "organizeBookmarks",
      organizationType: selectedType,
    });
  });
});
