const express = require("express");
const { asyncRoute } = require("../utils/http");
const { root, health } = require("../controllers/system.controller");

const router = express.Router();
router.get("/", asyncRoute(root));
router.get("/health", asyncRoute(health));

module.exports = router;
