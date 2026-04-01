import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadClientCredentials } from "../auth/client-credentials.js";
import { performOAuthFlow } from "../auth/oauth.js";
import { saveAccount, loadAccount, deleteAccount } from "../auth/token-store.js";
import { getProfile } from "../fitbit/client.js";

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

export function registerAuthTools(server: McpServer): void {
  server.tool(
    "fitbit_connect",
    "Connect your Fitbit account via OAuth. Opens a browser for authorization.",
    {},
    async () => {
      try {
        const creds = await loadClientCredentials();
        const tokens = await performOAuthFlow(creds.client_id, creds.client_secret);
        // Save tokens first so getProfile() can use them
        await saveAccount({
          user_id: tokens.user_id,
          display_name: tokens.user_id,
          tokens,
        });
        // Now fetch profile to get display name
        try {
          const profile = await getProfile();
          await saveAccount({
            user_id: tokens.user_id,
            display_name: profile.displayName ?? tokens.user_id,
            tokens,
          });
          return toolResult({ success: true, user: profile.displayName, message: "Fitbit connected!" });
        } catch {
          // Profile fetch failed but tokens are saved — still connected
          return toolResult({ success: true, user: tokens.user_id, message: "Fitbit connected (couldn't fetch profile name)." });
        }
      } catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_status",
    "Check if Fitbit account is connected and tokens are valid.",
    {},
    async () => {
      try {
        const account = await loadAccount();
        if (!account) {
          return toolResult({ connected: false, message: "Not connected. Use fitbit_connect." });
        }
        const expired = account.tokens.expires_at < Date.now();
        return toolResult({
          connected: true,
          user: account.display_name,
          tokenExpired: expired,
          expiresAt: new Date(account.tokens.expires_at).toISOString(),
        });
      } catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_disconnect",
    "Disconnect your Fitbit account and remove stored tokens.",
    {},
    async () => {
      try {
        await deleteAccount();
        return toolResult({ success: true, message: "Fitbit disconnected." });
      } catch (e) { return toolError(e); }
    },
  );
}
