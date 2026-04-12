import os from "node:os";
import path from "node:path";

const homedir = os.homedir();

export const CONFIG_DIR = process.env.TOKEN_DIR
  ? path.resolve(process.env.TOKEN_DIR)
  : path.join(homedir, ".config", "claude-fitbit-mcp");
export const TOKEN_FILE = path.join(CONFIG_DIR, "tokens.json");
export const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
export const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
export const FITBIT_API_BASE = "https://api.fitbit.com";

export const SCOPES = [
  "activity",
  "heartrate",
  "sleep",
  "weight",
  "profile",
  "nutrition",
  "oxygen_saturation",
  "respiratory_rate",
  "temperature",
];

export const OAUTH_REDIRECT_PORT = 8977;
export const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_REDIRECT_PORT}/callback`;
export const OAUTH_TIMEOUT_MS = 120_000;
