const path = require("path");

module.exports = {
  API_KEY: process.env.API_KEY || "NR_OFICIAL_2026",
  PORT: Number(process.env.PORT || 3000),
  API_NAME: process.env.API_NAME || "NR API",
  API_VERSION: process.env.API_VERSION || "4.2.1",
  YTDLP_BIN: process.env.YTDLP_BIN || "yt-dlp",
  FFMPEG_BIN: process.env.FFMPEG_BIN || "ffmpeg",
  GALLERYDL_BIN: process.env.GALLERYDL_BIN || "gallery-dl",
  TEMP_DIR: path.resolve(process.env.TEMP_DIR || "./tmp"),
  ENABLE_LEGACY_YT_ROUTES:
    String(process.env.ENABLE_LEGACY_YT_ROUTES || "true") === "true",
};
