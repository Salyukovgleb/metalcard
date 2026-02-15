function safeServerLocalStorageStub() {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const current = (globalThis as { localStorage?: unknown }).localStorage as
    | { getItem?: unknown }
    | undefined;

  if (typeof current === "undefined" || typeof current.getItem === "function") {
    return;
  }

  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      enumerable: false,
      value: safeServerLocalStorageStub(),
    });
  } catch {
    (globalThis as { localStorage?: unknown }).localStorage = safeServerLocalStorageStub();
  }
}
