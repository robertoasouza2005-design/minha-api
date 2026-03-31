const path = require("path");

function extractReadableError(error) {
  if (!error) return "Erro desconhecido";
  return (
    error.stderr ||
    error.stdout ||
    error.message ||
    "Erro desconhecido"
  ).toString().slice(0, 500);
}

function guessContentType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  const types = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
}

function isYouTubeUrl(url = "") {
  return /(youtube\.com|youtu\.be)/i.test(String(url));
}

function sanitizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!["http:", "https:"].includes(protocol)) {
    return "";
  }

  parsed.hash = "";
  return parsed.toString();
}

module.exports = { extractReadableError, guessContentType, isYouTubeUrl, sanitizeUrl };
