import fs from "node:fs/promises";
import { CONFIG_DIR, TOKEN_FILE } from "../config.js";
import type { StoredAccount } from "../types.js";

export async function saveAccount(account: StoredAccount): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(account, null, 2), "utf-8");
}

export async function loadAccount(): Promise<StoredAccount | null> {
  try {
    const raw = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as StoredAccount;
  } catch {
    return null;
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch {}
}
