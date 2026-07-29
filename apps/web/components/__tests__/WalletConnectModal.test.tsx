Object.defineProperty(navigator, "userAgent", {
  value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  configurable: true,
});

const { user } = renderModal();Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText },
});