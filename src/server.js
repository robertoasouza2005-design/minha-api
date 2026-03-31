require("dotenv").config();
const app = require("./app");
const { PORT, API_NAME, API_VERSION } = require("./config/env");
const { log } = require("./utils/logger");
const { ensureTempDir } = require("./utils/files");

ensureTempDir();

app.listen(PORT, () => {
  log("info", "server", "api_started", {
    service: API_NAME,
    version: API_VERSION,
    port: PORT,
  });
});
