import http from "node:http";
import open from "open";
import {
  FITBIT_AUTH_URL,
  FITBIT_TOKEN_URL,
  SCOPES,
  OAUTH_REDIRECT_PORT,
  OAUTH_REDIRECT_URI,
  OAUTH_TIMEOUT_MS,
} from "../config.js";
import type { Credentials } from "../types.js";

export async function performOAuthFlow(
  clientId: string,
  clientSecret: string,
  options: { openBrowser?: boolean } = {},
): Promise<Credentials> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: SCOPES.join(" "),
    prompt: "consent",
  });

  const authUrl = `${FITBIT_AUTH_URL}?${params}`;

  return new Promise<Credentials>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://localhost:${OAUTH_REDIRECT_PORT}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h1>Authorization denied</h1><p>${error}</p>`);
          cleanup();
          reject(new Error(`OAuth authorization denied: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Missing authorization code</h1>");
          return;
        }

        const tokens = await exchangeCode(clientId, clientSecret, code);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Fitbit connected!</h1><p>You can close this tab.</p>");
        cleanup();
        resolve(tokens);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>Error exchanging code</h1>");
        cleanup();
        reject(err);
      }
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("OAuth flow timed out after 2 minutes."));
    }, OAUTH_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    server.listen(OAUTH_REDIRECT_PORT, () => {
      process.stderr.write(`\nVisit this URL to authorize Fitbit:\n${authUrl}\n\n`);
      if (options.openBrowser !== false) {
        open(authUrl).catch(() => {});
      }
    });

    server.on("error", (err) => {
      cleanup();
      reject(new Error(`Failed to start OAuth server on port ${OAUTH_REDIRECT_PORT}: ${err.message}`));
    });
  });
}

async function exchangeCode(clientId: string, clientSecret: string, code: string): Promise<Credentials> {
  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json() as any;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
    user_id: data.user_id,
  };
}

export async function refreshTokens(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<Credentials> {
  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json() as any;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
    user_id: data.user_id,
  };
}
