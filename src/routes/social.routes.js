const express = require("express");
const { asyncRoute } = require("../utils/http");
const { requireApiKey } = require("./_middlewares");
const { socialInfo, socialMedia } = require("../controllers/social.controller");

const router = express.Router();
router.get("/social/info", requireApiKey, asyncRoute(socialInfo));
router.get("/social/media", requireApiKey, asyncRoute(socialMedia));

module.exports = router;
