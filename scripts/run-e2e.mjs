import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const origin = "http://127.0.0.1:3000";
const node = process.execPath;
const nextCli = resolve("node_modules/next/dist/bin/next");
const playwrightCli = resolve("node_modules/@playwright/test/cli.js");
let server = null;

async function reachable() {
  try {
    const response = await fetch(origin, { signal: AbortSignal.timeout(1_000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`The development server did not become ready at ${origin}.`);
}

function stopServer() {
  if (!server?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // The server already exited.
    }
  }
  server = null;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopServer();
    process.exit(130);
  });
}

if (!(await reachable())) {
  server = spawn(node, [nextCli, "dev"], {
    detached: process.platform !== "win32",
    env: process.env,
    stdio: "inherit",
  });
  await waitForServer();
}

const runnerArgs = process.argv.slice(2).filter((argument) => argument !== "--");
const runner = spawn(node, [playwrightCli, "test", ...runnerArgs], {
  env: process.env,
  stdio: "inherit",
});

runner.on("exit", (code, signal) => {
  stopServer();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
