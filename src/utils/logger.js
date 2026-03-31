function nowIso() {
  return new Date().toISOString();
}

function log(level, route, message, extra = {}) {
  console.log(JSON.stringify({
    time: nowIso(),
    level,
    route,
    message,
    ...extra,
  }));
}

module.exports = { log, nowIso };
