# claude-fitbit-mcp

MCP server providing read-only access to Fitbit health data (sleep, heart rate, steps, activity, weight, SpO2, breathing rate, skin temperature) for Claude Code and Claude Desktop.

## Architecture

Stdio-based MCP server built on `@modelcontextprotocol/sdk`. Authenticates via OAuth 2.0 Authorization Code flow — opens the user's browser to Fitbit's consent page, runs a temporary HTTP server on port 8977 to capture the callback, then exchanges the code for tokens. Wraps the [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/) with a thin client module that handles Bearer token auth and automatic token refresh (5 minutes before expiry). Tokens are persisted to disk as plain JSON.

## Prerequisites

- Node.js >= 18
- A Fitbit account with a compatible device
- A registered Fitbit app at [dev.fitbit.com](https://dev.fitbit.com/apps/new) with:
  - **OAuth 2.0 Application Type**: Personal
  - **Redirect URL**: `http://localhost:8977/callback`
  - **Default Access Type**: Read Only

## Setup

### 1. Install & Build

```bash
npm install
npm run build
```

### 2. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FITBIT_CLIENT_ID` | Yes* | OAuth client ID from your Fitbit app registration |
| `FITBIT_CLIENT_SECRET` | Yes* | OAuth client secret from your Fitbit app registration |

*Alternatively, create `~/.config/claude-fitbit-mcp/config.json`:
```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

### 3. MCP Client Configuration

**Claude Code** (`.claude.json` or project settings):
```json
{
  "mcpServers": {
    "fitbit": {
      "command": "node",
      "args": ["/absolute/path/to/claude-fitbit-mcp/dist/index.js"],
      "env": {
        "FITBIT_CLIENT_ID": "your_client_id",
        "FITBIT_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "fitbit": {
      "command": "node",
      "args": ["/absolute/path/to/claude-fitbit-mcp/dist/index.js"],
      "env": {
        "FITBIT_CLIENT_ID": "your_client_id",
        "FITBIT_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

After adding, use the `fitbit_connect` tool to authenticate via browser.

## Tools Reference

### Authentication (3 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `fitbit_connect` | _(none)_ | Connect Fitbit account via OAuth. Opens browser for authorization. |
| `fitbit_status` | _(none)_ | Check if Fitbit account is connected and tokens are valid. |
| `fitbit_disconnect` | _(none)_ | Disconnect Fitbit account and remove stored tokens. |

### Health Data (11 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `fitbit_profile` | _(none)_ | Get user profile info (name, age, height, weight, average daily steps). |
| `fitbit_daily_summary` | `date?: string` | Combined daily overview: activity, sleep, and heart rate. Best for a quick snapshot. |
| `fitbit_sleep` | `date?: string` | Detailed sleep data: duration, efficiency, stages (deep/light/REM/wake), start/end times. |
| `fitbit_sleep_range` | `start_date: string, end_date: string` | Sleep data for a date range. |
| `fitbit_heart_rate` | `date?: string` | Resting HR and time-in-zone breakdown (Out of Range, Fat Burn, Cardio, Peak). |
| `fitbit_heart_rate_intraday` | `date?: string, detail_level?: "1min" \| "5min"` | Intraday HR at 1min or 5min intervals. Useful for workout analysis. |
| `fitbit_activity` | `date?: string` | Daily activity summary: steps, calories, active minutes, distance, floors. |
| `fitbit_activity_log` | `before_date?: string, limit?: number` | Recent exercise/workout sessions with duration, calories, HR zones. |
| `fitbit_weight` | `start_date?: string, end_date?: string` | Weight log entries for a date range. |
| `fitbit_spo2` | `date?: string` | Blood oxygen (SpO2) data. |
| `fitbit_breathing_rate` | `date?: string` | Breathing rate data. |
| `fitbit_skin_temperature` | `date?: string` | Skin temperature variation data. |

All `date` parameters use `YYYY-MM-DD` format and default to today.

## Internal API Layer

### `fitbit/client` module

- **Purpose**: Thin wrapper around the Fitbit Web API. All 11 health tools delegate to this module.
- **Base URL**: `https://api.fitbit.com`
- **Auth flow**: Reads tokens from the token store. If tokens expire within 5 minutes, automatically refreshes using the refresh token before making the request. Uses `Authorization: Bearer <token>` for API calls and `Authorization: Basic <base64(id:secret)>` for token exchange/refresh.
- **Key functions**: `getProfile()`, `getSleep(date?)`, `getSleepRange(start, end)`, `getHeartRate(date?)`, `getHeartRateIntraday(date?, detailLevel?)`, `getDailyActivity(date?)`, `getActivityLog(beforeDate?, limit?)`, `getWeight(start?, end?)`, `getSpO2(date?)`, `getBreathingRate(date?)`, `getSkinTemperature(date?)`, `getDailySummary(date?)`
- **Error handling**: Throws `Error` with HTTP status and response body on API failures. Tools catch these and return `{ isError: true }` MCP responses.

### `auth/oauth` module

- **Purpose**: OAuth 2.0 Authorization Code flow implementation.
- **Flow**: Starts temp HTTP server on port 8977 → opens browser to Fitbit consent page → captures callback with auth code → exchanges code for tokens via POST to `https://api.fitbit.com/oauth2/token` → returns `Credentials` object.
- **Timeout**: 120 seconds. Rejects with error if user doesn't complete authorization.
- **Scopes requested**: `activity`, `heartrate`, `sleep`, `weight`, `profile`, `nutrition`, `oxygen_saturation`, `respiratory_rate`, `temperature`

### `auth/token-store` module

- **Purpose**: Persists OAuth tokens to `~/.config/claude-fitbit-mcp/tokens.json`.
- **Key functions**: `saveAccount(account)`, `loadAccount()`, `deleteAccount()`
- **Storage format**: Plain JSON, no encryption.

## Data Models

```typescript
interface AppConfig {
  client_id: string;
  client_secret: string;
}

interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;    // Unix timestamp (ms) when access_token expires
  token_type: string;
  scope: string;
  user_id: string;
}

interface StoredAccount {
  user_id: string;
  display_name: string;
  tokens: Credentials;
}
```

## Development

```bash
npm run dev    # Run with tsx (watch-less dev mode)
npm run build  # Compile TypeScript to dist/
npm start      # Run compiled dist/index.js
```

## Security Considerations

- **Token storage**: OAuth tokens (access + refresh) are stored as plain JSON at `~/.config/claude-fitbit-mcp/tokens.json` with no encryption. Protect this file with appropriate filesystem permissions.
- **Client credentials**: Can be stored in env vars or `~/.config/claude-fitbit-mcp/config.json` (also plain JSON).
- **Data access**: The server requests broad Fitbit scopes (activity, heartrate, sleep, weight, profile, nutrition, oxygen_saturation, respiratory_rate, temperature). All access is read-only.
- **Local callback server**: A temporary HTTP server on port 8977 is started during OAuth and shut down after the callback is received.
- **No rate limiting**: The server does not implement rate limiting against the Fitbit API. Fitbit enforces its own rate limits (150 requests/hour for personal apps).

## License

MIT
