# @tasque/fitbit-mcp

MCP server for read-only access to Fitbit health data via the Fitbit Web API.

## Tools

| Tool | Description |
|------|-------------|
| `fitbit_connect` | Connect Fitbit account via OAuth (opens browser) |
| `fitbit_status` | Check if account is connected and tokens are valid |
| `fitbit_disconnect` | Disconnect account and remove stored tokens |
| `fitbit_profile` | Get user profile info |
| `fitbit_daily_summary` | Combined daily overview: activity, sleep, heart rate |
| `fitbit_sleep` | Detailed sleep data with stages |
| `fitbit_sleep_range` | Sleep data for a date range |
| `fitbit_heart_rate` | Resting HR and time-in-zone breakdown |
| `fitbit_heart_rate_intraday` | Intraday HR at 1min or 5min intervals |
| `fitbit_activity` | Daily activity summary |
| `fitbit_activity_log` | Recent exercise/workout sessions |
| `fitbit_weight` | Weight log entries for a date range |
| `fitbit_spo2` | Blood oxygen (SpO2) data |
| `fitbit_breathing_rate` | Breathing rate data |
| `fitbit_skin_temperature` | Skin temperature variation data |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FITBIT_CLIENT_ID` | Yes | OAuth client ID from Fitbit app registration |
| `FITBIT_CLIENT_SECRET` | Yes | OAuth client secret from Fitbit app registration |

## Auth Setup

1. Register a Fitbit app at [dev.fitbit.com/apps/new](https://dev.fitbit.com/apps/new) with OAuth type "Personal" and redirect URL `http://localhost:8977/callback`
2. Set `FITBIT_CLIENT_ID` and `FITBIT_CLIENT_SECRET` environment variables
3. Use the `fitbit_connect` tool to authenticate via browser

Tokens are persisted to `~/.config/claude-fitbit-mcp/tokens.json`.

## Development

```bash
npm install
npm run build
npm start        # stdio mode
```
