function normalizeTitle(title = "media") {
  return String(title).replace(/[^\w\s.-]/g, "").trim() || "media";
}

function sanitizeText(input, max = 150) {
  return String(input || "").trim().replace(/\s+/g, " ").slice(0, max);
}

module.exports = { normalizeTitle, sanitizeText };
