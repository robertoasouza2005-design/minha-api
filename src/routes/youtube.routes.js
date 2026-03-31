const express = require("express");
const { asyncRoute } = require("../utils/http");
const { requireApiKey } = require("./_middlewares");
const { ENABLE_LEGACY_YT_ROUTES } = require("../config/env");
const { ytSearch, ytPlay, ytMp3, ytMp4 } = require("../controllers/youtube.controller");

const router = express.Router();
router.get("/ytsearch", requireApiKey, asyncRoute(ytSearch));
router.get("/ytplayv2", requireApiKey, asyncRoute(ytPlay));
router.get("/youtube/mp3", requireApiKey, asyncRoute(ytMp3));
router.get("/youtube/mp4", requireApiKey, asyncRoute(ytMp4));

if (ENABLE_LEGACY_YT_ROUTES) {
  router.get("/ytmp3", requireApiKey, asyncRoute(ytMp3));
  router.get("/ytmp4", requireApiKey, asyncRoute(ytMp4));
}

module.exports = router;
