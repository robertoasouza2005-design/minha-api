const path = require("path");

function toBool(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

module.exports = {
  API_KEY: process.env.API_KEY || "NR_OFICIAL_2026",
  PORT: Number(process.env.PORT || 3000),
  API_NAME: process.env.API_NAME || "NR API",
  API_VERSION: process.env.API_VERSION || "4.2.1",
  YTDLP_BIN: process.env.YTDLP_BIN || "yt-dlp",
  FFMPEG_BIN: process.env.FFMPEG_BIN || "ffmpeg",
  GALLERY_DL_BIN: process.env.GALLERY_DL_BIN || "gallery-dl",
  TEMP_DIR: path.resolve(process.env.TEMP_DIR || "./tmp"),
  DOWNLOAD_TIMEOUT_MS: Number(process.env.DOWNLOAD_TIMEOUT_MS || 180000),
  ENABLE_LEGACY_YT_ROUTES: toBool(process.env.ENABLE_LEGACY_YT_ROUTES, true),
  EXPOSE_API_KEY_IN_LINKS: toBool(process.env.EXPOSE_API_KEY_IN_LINKS, false),
  ENABLE_SOCIAL_ROUTES: toBool(process.env.ENABLE_SOCIAL_ROUTES, true),
  ENABLE_IMAGE_ROUTES: toBool(process.env.ENABLE_IMAGE_ROUTES, true),
};
