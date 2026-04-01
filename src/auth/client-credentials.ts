import fs from "node:fs/promises";
import { CONFIG_FILE } from "../config.js";
import type { AppConfig } from "../types.js";

export async function loadClientCredentials(): Promise<AppConfig> {
  const envId = process.env.FITBIT_CLIENT_ID;
  const envSecret = process.env.FITBIT_CLIENT_SECRET;
  if (envId && envSecret) {
    return { client_id: envId, client_secret: envSecret };
  }

  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw) as Partial<AppConfig>;
    if (config.client_id && config.client_secret) {
      return config as AppConfig;
    }
  } catch {}

  throw new Error(
    `Fitbit OAuth credentials not found. Either:\n` +
    `  1. Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET environment variables, or\n` +
    `  2. Create ${CONFIG_FILE} with {"client_id": "...", "client_secret": "..."}\n` +
    `\nRegister an app at https://dev.fitbit.com/apps/new (type: Personal, callback: http://localhost:${8977}/callback)`
  );
}
