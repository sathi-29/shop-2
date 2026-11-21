import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(frontendRoot, "..");
const jarvisRoot = resolve(projectRoot, "jarvis-assistant");
const voiceAgentRoot = resolve(projectRoot, "voice-agent");
const args = process.argv.slice(2);
const withVoiceAgent = args.includes("--with-voice-agent");
const nextArgs = args.filter((arg) => arg !== "--with-voice-agent");
const jarvisPort = process.env.JARVIS_PORT ?? "8787";
const voiceAgentPort = process.env.VOICE_AGENT_PORT ?? "8788";
const childEnv = { ...process.env, JARVIS_PORT: jarvisPort };
const children = [];

if (withVoiceAgent) {
  const voiceAgentToken =
    process.env.VOICE_AGENT_TOKEN || randomBytes(32).toString("hex");
  Object.assign(childEnv, {
    VOICE_AGENT_HOST: "127.0.0.1",
    VOICE_AGENT_PORT: voiceAgentPort,
    VOICE_AGENT_URL: `http://127.0.0.1:${voiceAgentPort}`,
    VOICE_AGENT_TOKEN: voiceAgentToken,
  });
  const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
  children.push(
    spawn(python, ["-m", "voice_agent", "serve"], {
      cwd: voiceAgentRoot,
      env: childEnv,
      stdio: "inherit",
    }),
  );
}
const jarvis = spawn(process.execPath, ["server/index.js"], {
  cwd: jarvisRoot,
  env: { ...childEnv, PORT: jarvisPort },
  stdio: "inherit",
});
const next = spawn(
  process.execPath,
  [
    resolve(frontendRoot, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    ...nextArgs,
  ],
  {
    cwd: frontendRoot,
    env: childEnv,
    stdio: "inherit",
  },
);
children.push(jarvis, next);

let stopping = false;
function stopChildren(signal) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start a ShopSphere development service.", error);
    process.exitCode = 1;
    stopChildren("SIGTERM");
  });
  child.on("exit", (code) => {
    if (!stopping) {
      process.exitCode = code ?? 1;
      stopChildren("SIGTERM");
    }
  });
}

process.on("SIGINT", () => stopChildren("SIGINT"));
process.on("SIGTERM", () => stopChildren("SIGTERM"));
