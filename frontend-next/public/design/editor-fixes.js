(function () {
  function dispatchInput(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function bindSide(prefix) {
    const root = document.getElementById(`side-${prefix}-inscription`);
    const textInput = document.getElementById(`side-${prefix}-inscription-text`);
    const deleteBtn = document.getElementById(`side-${prefix}-inscription-delete-btn`);

    if (!root || !textInput || !deleteBtn) {
      return;
    }

    const counter = root.querySelector(".configurator__card-data-inscription-desc p");
    const updateCounter = function () {
      const safe = String(textInput.value || "").slice(0, 20);
      if (safe !== textInput.value) {
        textInput.value = safe;
      }
      if (counter) {
        counter.textContent = safe.length + "/20";
      }
    };

    textInput.addEventListener("input", updateCounter);
    updateCounter();

    deleteBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      textInput.value = "";
      dispatchInput(textInput);
      textInput.focus();
    });

    const radios = root.querySelectorAll(`input[name="side-${prefix}-inscription-font"]`);
    radios.forEach(function (radio) {
      radio.addEventListener("input", function () {
        dispatchInput(textInput);
      });
      radio.addEventListener("change", function () {
        dispatchInput(textInput);
      });
    });
  }

  function init() {
    bindSide("a");
    bindSide("b");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
    return;
  }

  init();
})();
