const { API_NAME, API_VERSION, YTDLP_BIN, FFMPEG_BIN, GALLERY_DL_BIN } = require("../config/env");
const { ok } = require("../utils/http");
const { ensureBinaries } = require("../services/download.orchestrator");

const STARTED_AT = Date.now();

async function root(req, res) {
  return ok(res, {
    service: API_NAME,
    version: API_VERSION,
    uptime: process.uptime(),
    startedAt: STARTED_AT,
    now: Date.now(),
  }, { message: "API NR online" });
}

async function health(req, res) {
  let binaries = { ytdlp: false, ffmpeg: false, gallerydl: false };
  try {
    binaries = await ensureBinaries();
  } catch {}

  return ok(res, {
    service: API_NAME,
    version: API_VERSION,
    uptime: process.uptime(),
    startedAt: STARTED_AT,
    now: Date.now(),
    env: process.env.NODE_ENV || "development",
    binaries,
    paths: { ytdlp: YTDLP_BIN, ffmpeg: FFMPEG_BIN, gallerydl: GALLERY_DL_BIN },
  }, { message: "API saudável" });
}

module.exports = { root, health };
