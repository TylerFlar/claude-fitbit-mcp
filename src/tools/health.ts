import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getProfile,
  getSleep,
  getSleepRange,
  getHeartRate,
  getHeartRateIntraday,
  getDailyActivity,
  getActivityLog,
  getWeight,
  getSpO2,
  getBreathingRate,
  getSkinTemperature,
  getDailySummary,
  getFoodLog,
  getNutritionSummary,
  getNutritionTimeseries,
  getWaterLog,
  getActivityGoals,
  getActivityTimeseries,
  getAZMTimeseries,
} from "../fitbit/client.js";

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

const dateParam = z.string().optional().describe("Date in YYYY-MM-DD format (defaults to today)");

export function registerHealthTools(server: McpServer): void {
  server.tool(
    "fitbit_profile",
    "Get user profile info (name, age, height, weight, average daily steps).",
    {},
    async () => {
      try { return toolResult(await getProfile()); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_daily_summary",
    "Get a combined daily summary: activity (steps, calories, active minutes), sleep (duration, stages), and heart rate (resting HR, zones). Best for a quick daily overview.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getDailySummary(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_sleep",
    "Get detailed sleep data for a date: duration, efficiency, stages (deep/light/REM/wake), start/end times.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getSleep(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_sleep_range",
    "Get sleep data for a date range.",
    {
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ start_date, end_date }) => {
      try { return toolResult(await getSleepRange(start_date, end_date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_heart_rate",
    "Get heart rate data: resting HR and time-in-zone breakdown (Out of Range, Fat Burn, Cardio, Peak).",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getHeartRate(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_heart_rate_intraday",
    "Get intraday heart rate data at 1min or 5min intervals. Useful for seeing HR during workouts.",
    {
      date: dateParam,
      detail_level: z.enum(["1min", "5min"]).optional().describe("Granularity (default: 5min)"),
    },
    async ({ date, detail_level }) => {
      try { return toolResult(await getHeartRateIntraday(date, detail_level ?? "5min")); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_activity",
    "Get daily activity summary: steps, calories burned, active minutes, distance, floors.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getDailyActivity(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_activity_log",
    "Get recent exercise/workout sessions with details (name, duration, calories, HR zones).",
    {
      before_date: dateParam,
      limit: z.number().optional().describe("Number of activities to return (default: 10)"),
    },
    async ({ before_date, limit }) => {
      try { return toolResult(await getActivityLog(before_date, limit ?? 10)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_weight",
    "Get weight log entries for a date range.",
    {
      start_date: dateParam,
      end_date: dateParam,
    },
    async ({ start_date, end_date }) => {
      try { return toolResult(await getWeight(start_date, end_date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_spo2",
    "Get blood oxygen (SpO2) data for a date.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getSpO2(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_breathing_rate",
    "Get breathing rate data for a date.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getBreathingRate(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_skin_temperature",
    "Get skin temperature variation data for a date.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getSkinTemperature(date)); }
      catch (e) { return toolError(e); }
    },
  );

  // --- Nutrition / Food Logging ---

  server.tool(
    "fitbit_food_log",
    "Get food diary for a date: meals (breakfast/lunch/dinner/snacks), foods logged, calories and macros per entry, and daily totals.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getFoodLog(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_nutrition_summary",
    "Get daily nutrition totals: calories, carbs, fat, protein, fiber, sodium, water.",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getNutritionSummary(date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_nutrition_timeseries",
    "Get daily values for a nutrient over a date range (e.g. calories, protein, water).",
    {
      nutrient: z.enum(["caloriesIn", "water", "protein", "fat", "carbs", "fiber", "sodium"]).describe("Nutrient to query"),
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ nutrient, start_date, end_date }) => {
      try { return toolResult(await getNutritionTimeseries(nutrient, start_date, end_date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_water",
    "Get water intake for a date (ml/oz, individual entries and total).",
    { date: dateParam },
    async ({ date }) => {
      try { return toolResult(await getWaterLog(date)); }
      catch (e) { return toolError(e); }
    },
  );

  // --- Activity Goals & Timeseries ---

  server.tool(
    "fitbit_activity_goals",
    "Get activity goals (steps, distance, calories, active minutes, floors) for daily or weekly period.",
    {
      period: z.enum(["daily", "weekly"]).describe("Goal period: daily or weekly"),
    },
    async ({ period }) => {
      try { return toolResult(await getActivityGoals(period)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_activity_timeseries",
    "Get daily values for an activity resource over a date range (max 30 days). E.g. steps, calories, active minutes trends.",
    {
      resource: z.enum([
        "steps", "distance", "calories",
        "minutesSedentary", "minutesLightlyActive", "minutesFairlyActive", "minutesVeryActive",
        "floors", "elevation",
      ]).describe("Activity resource to query"),
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().describe("End date (YYYY-MM-DD, max 30 days from start)"),
    },
    async ({ resource, start_date, end_date }) => {
      try { return toolResult(await getActivityTimeseries(resource, start_date, end_date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_azm_timeseries",
    "Get Active Zone Minutes per day over a date range.",
    {
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ start_date, end_date }) => {
      try { return toolResult(await getAZMTimeseries(start_date, end_date)); }
      catch (e) { return toolError(e); }
    },
  );
}
