const { spawn } = require("child_process");

function killProcess(child) {
  try {
    child.kill("SIGTERM");
  } catch {}

  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {}
  }, 3000).unref();
}

function runCommand(bin, args, options = {}) {
  const { timeoutMs = 0, ...spawnOptions } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"], ...spawnOptions });
    let stdout = "";
    let stderr = "";
    let finished = false;
    let timer = null;

    const done = (fn, value) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      fn(value);
    };

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("error", (error) => {
      error.stdout = stdout;
      error.stderr = stderr;
      done(reject, error);
    });

    child.on("close", (code, signal) => {
      if (code === 0) return done(resolve, { stdout, stderr, code, signal });
      const error = new Error(stderr || `Comando falhou com código ${code}`);
      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      done(reject, error);
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        killProcess(child);
        const error = new Error(`Comando excedeu o tempo limite de ${timeoutMs}ms`);
        error.code = "ETIMEDOUT";
        error.stdout = stdout;
        error.stderr = stderr;
        done(reject, error);
      }, timeoutMs);

      if (typeof timer.unref === "function") timer.unref();
    }
  });
}

module.exports = { runCommand };
