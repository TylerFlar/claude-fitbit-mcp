#!/usr/bin/env npx tsx
/**
 * Headless OAuth setup for Fitbit MCP.
 * Prints the auth URL to stdout instead of opening a browser.
 *
 * Usage:
 *   npx tsx scripts/setup-auth.ts
 *
 * Set TOKEN_DIR to control where tokens are written (defaults to ~/.config/claude-fitbit-mcp).
 * Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET env vars.
 */

import { loadClientCredentials } from "../src/auth/client-credentials.js";
import { performOAuthFlow } from "../src/auth/oauth.js";
import { saveAccount } from "../src/auth/token-store.js";

const creds = await loadClientCredentials();
console.log("Starting Fitbit OAuth setup...");
console.log("Waiting for browser authorization (2 minute timeout)...\n");

const tokens = await performOAuthFlow(creds.client_id, creds.client_secret, {
  openBrowser: false,
});

await saveAccount({
  user_id: tokens.user_id!,
  display_name: tokens.user_id!,
  tokens,
});

console.log(`\nTokens saved successfully. User ID: ${tokens.user_id}`);
process.exit(0);
