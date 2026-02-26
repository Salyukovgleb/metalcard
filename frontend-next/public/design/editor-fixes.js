(function () {
  const DEFAULT_COLOR_PRICE = 300000;
  const DELIVERY_PRICE = 50000;

  let priceSyncTimer = null;
  let designPriceLoadPromise = null;
  let colorPriceLoadPromise = null;
  let designPriceById = {};
  let colorPriceByCode = null;
  let colorPriceByCodeLoaded = false;

  function dispatchInput(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function setTextIfChanged(element, nextText) {
    if (!element) {
      return;
    }
    if (element.textContent !== nextText) {
      element.textContent = nextText;
    }
  }

  function formatUzs(amount) {
    return Math.round(toNumber(amount, 0)).toLocaleString("ru-RU");
  }

  function isPromoPage() {
    return Boolean(document.getElementById("promo-json"));
  }

  function parseJsonNodeText(id, fallback) {
    const node = document.getElementById(id);
    if (!node || !node.textContent) {
      return fallback;
    }

    try {
      return JSON.parse(node.textContent);
    } catch (_) {
      return fallback;
    }
  }

  function loadColorPricesFromApi() {
    if (colorPriceLoadPromise) {
      return colorPriceLoadPromise;
    }

    colorPriceLoadPromise = fetch("/api/colors", { method: "GET" })
      .then(function (response) {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then(function (payload) {
        const nextMap = {};
        const items = payload && Array.isArray(payload.items) ? payload.items : [];

        items.forEach(function (item) {
          const code = item && item.code ? String(item.code) : "";
          const markup = toNumber(item && item.markup, 0);
          if (code && markup > 0) {
            nextMap[code] = Math.round(markup);
          }
        });

        if (Object.keys(nextMap).length > 0) {
          colorPriceByCode = nextMap;
          colorPriceByCodeLoaded = true;
        }
      })
      .catch(function () {
        // Keep existing prices on error
      });

    return colorPriceLoadPromise;
  }

  function getColorPriceByCode() {
    if (colorPriceByCode && colorPriceByCodeLoaded) {
      return colorPriceByCode;
    }

    if (colorPriceByCode) {
      return colorPriceByCode;
    }

    var parsed = parseJsonNodeText("card-colors-to-price-json", {});
    colorPriceByCode = parsed && typeof parsed === "object" ? parsed : {};
    return colorPriceByCode;
  }

  function getSelectedColorCode() {
    const selected = document.querySelector('input[name="card-color"]:checked');
    return selected ? String(selected.value || "") : "";
  }

  function getSelectedDesignId() {
    const selected = document.querySelector('input[name="variant"]:checked');
    return selected ? String(selected.value || "") : "";
  }

  function getCurrentDesignBasePrice() {
    const designId = getSelectedDesignId();
    if (!designId) {
      return 0;
    }
    return toNumber(designPriceById[designId], 0);
  }

  function getCurrentColorPrice() {
    const selectedColor = getSelectedColorCode();
    const priceMap = getColorPriceByCode();
    return toNumber(priceMap[selectedColor], DEFAULT_COLOR_PRICE);
  }

  function isLogoDeactive() {
    const checkbox = document.getElementById("remove-logo");
    return Boolean(checkbox && checkbox.checked);
  }

  function isDeliverySelected() {
    const delivery = document.getElementById("delivery-input");
    return Boolean(delivery && delivery.checked);
  }

  function calculateBaseEditorPrice() {
    const designBasePrice = getCurrentDesignBasePrice();
    let amount = designBasePrice > 0 ? designBasePrice : getCurrentColorPrice();
    if (isLogoDeactive()) {
      amount += DELIVERY_PRICE;
    }
    return Math.round(amount);
  }

  function syncDisplayedPricesNow() {
    if (isPromoPage()) {
      return;
    }

    const editorPrice = calculateBaseEditorPrice();
    const editorPriceText = formatUzs(editorPrice);

    document.querySelectorAll(".visual__bottom-price, .buy-section-price").forEach(function (node) {
      setTextIfChanged(node, editorPriceText);
    });

    const confirmTotal = editorPrice + (isDeliverySelected() ? DELIVERY_PRICE : 0);
    setTextIfChanged(document.querySelector(".confirm-price"), formatUzs(confirmTotal));
  }

  function schedulePriceSync() {
    if (isPromoPage()) {
      return;
    }

    if (priceSyncTimer) {
      window.clearTimeout(priceSyncTimer);
    }
    priceSyncTimer = window.setTimeout(function () {
      priceSyncTimer = null;
      syncDisplayedPricesNow();
    }, 0);
  }

  function loadDesignBasePrices() {
    if (isPromoPage()) {
      return Promise.resolve();
    }
    if (designPriceLoadPromise) {
      return designPriceLoadPromise;
    }

    designPriceLoadPromise = fetch("/api/getDesigns", { method: "GET" })
      .then(function (response) {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then(function (payload) {
        const nextMap = {};
        const rows = payload && Array.isArray(payload.data) ? payload.data : [];

        rows.forEach(function (row) {
          const id = row && row.id != null ? String(row.id) : "";
          const base = toNumber(row && row.basePrice, 0);
          if (id && base > 0) {
            nextMap[id] = Math.round(base);
          }
        });

        designPriceById = nextMap;
      })
      .catch(function () {
        designPriceById = {};
      });

    return designPriceLoadPromise;
  }

  function bindPriceSync() {
    if (isPromoPage()) {
      return;
    }

    Promise.all([loadDesignBasePrices(), loadColorPricesFromApi()]).then(schedulePriceSync);

    ["input", "change", "click"].forEach(function (eventName) {
      document.addEventListener(eventName, schedulePriceSync, true);
    });

    // Initial constructor widgets are rendered asynchronously by legacy script.
    let attempts = 0;
    const warmup = window.setInterval(function () {
      attempts += 1;
      schedulePriceSync();
      if (attempts >= 20) {
        window.clearInterval(warmup);
      }
    }, 300);
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
    bindPriceSync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
    return;
  }

  init();
})();
