# Claude Fitbit MCP

MCP server for Claude Code that provides read access to Fitbit health data — sleep, heart rate, steps, activity, weight, SpO2, and more.

## Setup

### 1. Create a Fitbit App

1. Go to [dev.fitbit.com/apps/new](https://dev.fitbit.com/apps/new)
2. Fill in:
   - **OAuth 2.0 Application Type**: Personal
   - **Redirect URL**: `http://localhost:8977/callback`
   - **Default Access Type**: Read Only
3. Note your **Client ID** and **Client Secret**

### 2. Configure Credentials

Either set environment variables:
```bash
export FITBIT_CLIENT_ID=your_client_id
export FITBIT_CLIENT_SECRET=your_client_secret
```

Or create `~/.config/claude-fitbit-mcp/config.json`:
```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

### 3. Install & Build

```bash
npm install
npm run build
```

### 4. Add to Claude Code

Add to your Claude Code MCP settings:
```json
{
  "mcpServers": {
    "fitbit": {
      "command": "node",
      "args": ["G:/01_Active/Code/personal/claude-fitbit-mcp/dist/index.js"]
    }
  }
}
```

### 5. Connect

In Claude Code, run: `fitbit_connect` — it will open a browser for OAuth authorization.

## Available Tools

| Tool | Description |
|------|-------------|
| `fitbit_connect` | Connect Fitbit account via OAuth |
| `fitbit_status` | Check connection status |
| `fitbit_disconnect` | Remove stored tokens |
| `fitbit_profile` | User profile (name, age, weight, avg steps) |
| `fitbit_daily_summary` | Combined daily overview (activity + sleep + HR) |
| `fitbit_sleep` | Detailed sleep data (stages, efficiency) |
| `fitbit_sleep_range` | Sleep data for a date range |
| `fitbit_heart_rate` | Resting HR + zone breakdown |
| `fitbit_heart_rate_intraday` | HR at 1min or 5min intervals |
| `fitbit_activity` | Steps, calories, active minutes, distance |
| `fitbit_activity_log` | Recent workout sessions |
| `fitbit_weight` | Weight log entries |
| `fitbit_spo2` | Blood oxygen data |
| `fitbit_breathing_rate` | Breathing rate data |
| `fitbit_skin_temperature` | Skin temperature variation |

All date parameters default to today if omitted.
