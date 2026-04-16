# @tasque/fitbit-mcp

MCP server for reading and writing Fitbit health data via the Fitbit Web API.

## Tools

### Read

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
| `fitbit_food_log` | Food diary for a date |
| `fitbit_nutrition_summary` | Daily nutrition totals |
| `fitbit_nutrition_timeseries` | Nutrient values over a date range |
| `fitbit_water` | Water intake for a date |
| `fitbit_activity_goals` | Daily/weekly activity goals |
| `fitbit_activity_timeseries` | Activity resource over a date range |
| `fitbit_azm_timeseries` | Active Zone Minutes over a date range |

### Write

Writes require the Fitbit app to have write permission enabled (in addition to read). The OAuth scope names are unchanged (`nutrition`, `activity`, `weight`, `sleep`), but **existing tokens minted before enabling write are still read-only** — run `fitbit_disconnect` then `fitbit_connect` once after upgrading the app permission.

| Tool | Description |
|------|-------------|
| `fitbit_log_food` | Log a food entry (by foodId or foodName + calories). Uses mealTypeId 1=Breakfast, 2=MorningSnack, 3=Lunch, 4=AfternoonSnack, 5=Dinner, 7=Anytime |
| `fitbit_delete_food_log` | Delete a food log entry by id |
| `fitbit_log_water` | Log water intake (ml / fl oz / cup) |
| `fitbit_delete_water_log` | Delete a water log entry by id |
| `fitbit_create_food` | Create a custom food in the user's food database |
| `fitbit_delete_food` | Delete a custom food by id |
| `fitbit_set_food_goal` | Set daily calorie goal (calories or intensity) |
| `fitbit_set_water_goal` | Set daily water goal |
| `fitbit_log_activity` | Log a completed workout (duration in milliseconds) |
| `fitbit_delete_activity_log` | Delete an activity log entry by id |
| `fitbit_set_activity_goal` | Set daily/weekly goal (steps, distance, calories, floors, active minutes, AZM) |
| `fitbit_log_weight` | Log a weight measurement |
| `fitbit_delete_weight_log` | Delete a weight log entry by id |
| `fitbit_log_body_fat` | Log a body fat percentage |
| `fitbit_delete_body_fat_log` | Delete a body fat log entry by id |
| `fitbit_set_weight_goal` | Set start/target weight goal |
| `fitbit_log_sleep` | Log a sleep session (duration in milliseconds) |
| `fitbit_delete_sleep_log` | Delete a sleep log entry by id |

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
