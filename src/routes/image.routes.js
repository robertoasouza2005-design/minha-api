const express = require("express");
const { asyncRoute } = require("../utils/http");
const { requireApiKey } = require("./_middlewares");
const { welcomeCanvas, simpleLogo, bannerText } = require("../controllers/image.controller");

const router = express.Router();
router.get("/canvas/welcome", requireApiKey, asyncRoute(welcomeCanvas));
router.get("/image/logo/simple", requireApiKey, asyncRoute(simpleLogo));
router.get("/image/banner/text", requireApiKey, asyncRoute(bannerText));

module.exports = router;
