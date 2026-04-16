import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  logFood,
  deleteFoodLog,
  logWater,
  deleteWaterLog,
  createCustomFood,
  deleteCustomFood,
  setFoodGoal,
  setWaterGoal,
  logActivity,
  deleteActivityLog,
  setActivityGoal,
  logWeight,
  deleteWeightLog,
  logBodyFat,
  deleteBodyFatLog,
  setWeightGoal,
  logSleep,
  deleteSleepLog,
} from "../fitbit/client.js";

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

const dateParam = z.string().optional().describe("Date in YYYY-MM-DD format (defaults to today)");
const mealTypeId = z.number().int().describe("1=Breakfast, 2=MorningSnack, 3=Lunch, 4=AfternoonSnack, 5=Dinner, 7=Anytime");

export function registerWriteTools(server: McpServer): void {
  // ---------- Food / Nutrition ----------

  server.tool(
    "fitbit_log_food",
    "Log a food entry. Provide EITHER foodId (from Fitbit food DB — preferred) OR foodName + calories + brandName (free-text). unitId/amount define portion (unitId varies per food; 304=grams is common).",
    {
      food_id: z.union([z.string(), z.number()]).optional().describe("Fitbit food database ID (preferred)"),
      food_name: z.string().optional().describe("Free-text food name (requires calories)"),
      brand_name: z.string().optional().describe("Brand name (used with food_name)"),
      calories: z.number().optional().describe("Calories per serving (required when using food_name)"),
      meal_type_id: mealTypeId,
      unit_id: z.number().int().describe("Fitbit unit ID for the portion (e.g. 304=grams)"),
      amount: z.number().describe("Amount in specified unit"),
      date: dateParam,
      favorite: z.boolean().optional().describe("Mark this food as a favorite"),
    },
    async ({ food_id, food_name, brand_name, calories, meal_type_id, unit_id, amount, date, favorite }) => {
      try {
        return toolResult(await logFood({
          foodId: food_id,
          foodName: food_name,
          brandName: brand_name,
          calories,
          mealTypeId: meal_type_id,
          unitId: unit_id,
          amount,
          date,
          favorite,
        }));
      } catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_food_log",
    "Delete a food log entry by its foodLogId (returned from fitbit_log_food or fitbit_food_log).",
    {
      food_log_id: z.union([z.string(), z.number()]).describe("ID of the food log entry to delete"),
    },
    async ({ food_log_id }) => {
      try { return toolResult(await deleteFoodLog(food_log_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_log_water",
    "Log water intake. unit defaults to the user's locale setting if omitted.",
    {
      amount: z.number().describe("Amount of water"),
      unit: z.enum(["ml", "fl oz", "cup"]).optional().describe("Unit: ml, fl oz, or cup"),
      date: dateParam,
    },
    async ({ amount, unit, date }) => {
      try { return toolResult(await logWater(amount, unit, date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_water_log",
    "Delete a water log entry by its waterLogId.",
    {
      water_log_id: z.union([z.string(), z.number()]).describe("ID of the water log entry to delete"),
    },
    async ({ water_log_id }) => {
      try { return toolResult(await deleteWaterLog(water_log_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_create_food",
    "Create a custom (private) food in the user's Fitbit food database. Returns the new food's ID for later use with fitbit_log_food.",
    {
      name: z.string().describe("Food name"),
      default_food_measurement_unit_id: z.number().int().describe("Default unit ID (e.g. 304=grams)"),
      default_serving_size: z.number().describe("Default serving size in that unit"),
      calories: z.number().describe("Calories per default serving"),
      form_type: z.enum(["LIQUID", "DRY"]).optional().describe("LIQUID or DRY"),
      description: z.string().optional(),
    },
    async ({ name, default_food_measurement_unit_id, default_serving_size, calories, form_type, description }) => {
      try {
        return toolResult(await createCustomFood({
          name,
          defaultFoodMeasurementUnitId: default_food_measurement_unit_id,
          defaultServingSize: default_serving_size,
          calories,
          formType: form_type,
          description,
        }));
      } catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_food",
    "Delete a custom food from the user's food database by its foodId.",
    {
      food_id: z.union([z.string(), z.number()]).describe("Custom food ID to delete"),
    },
    async ({ food_id }) => {
      try { return toolResult(await deleteCustomFood(food_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_set_food_goal",
    "Set the daily food (calorie) goal. Provide either calories OR intensity (weight-loss pace). personalized=true uses Fitbit-recommended calories.",
    {
      calories: z.number().optional().describe("Manual daily calorie goal"),
      intensity: z.enum(["MAINTENANCE", "EASIER", "MEDIUM", "KINDAHARD", "HARDER"]).optional().describe("Weight-loss intensity"),
      personalized: z.boolean().optional().describe("Use Fitbit-recommended calorie level"),
    },
    async ({ calories, intensity, personalized }) => {
      try { return toolResult(await setFoodGoal({ calories, intensity, personalized })); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_set_water_goal",
    "Set the daily water goal (in the user's default water unit).",
    {
      target: z.number().describe("Daily water goal amount"),
    },
    async ({ target }) => {
      try { return toolResult(await setWaterGoal(target)); }
      catch (e) { return toolError(e); }
    },
  );

  // ---------- Activity ----------

  server.tool(
    "fitbit_log_activity",
    "Log a completed activity/workout. Provide EITHER activity_id (Fitbit activity DB) OR activity_name + manual_calories. Duration is in milliseconds.",
    {
      activity_id: z.number().int().optional().describe("Fitbit activity ID (preferred)"),
      activity_name: z.string().optional().describe("Free-text activity name (requires manual_calories)"),
      manual_calories: z.number().optional().describe("Calories burned (required with activity_name)"),
      start_time: z.string().describe("Start time HH:mm (24h)"),
      duration_millis: z.number().int().describe("Duration in milliseconds"),
      date: dateParam,
      distance: z.number().optional(),
      distance_unit: z.string().optional().describe("Distance unit (e.g. Mile, Kilometer)"),
    },
    async ({ activity_id, activity_name, manual_calories, start_time, duration_millis, date, distance, distance_unit }) => {
      try {
        return toolResult(await logActivity({
          activityId: activity_id,
          activityName: activity_name,
          manualCalories: manual_calories,
          startTime: start_time,
          durationMillis: duration_millis,
          date,
          distance,
          distanceUnit: distance_unit,
        }));
      } catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_activity_log",
    "Delete an activity/exercise log entry by its activityLogId.",
    {
      activity_log_id: z.union([z.string(), z.number()]).describe("ID of the activity log to delete"),
    },
    async ({ activity_log_id }) => {
      try { return toolResult(await deleteActivityLog(activity_log_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_set_activity_goal",
    "Set a daily or weekly activity goal (steps, distance, calories out, floors, active minutes, active zone minutes).",
    {
      period: z.enum(["daily", "weekly"]).describe("Goal period"),
      type: z.enum([
        "activeMinutes", "activeZoneMinutes", "caloriesOut", "distance", "floors", "steps",
      ]).describe("Goal type"),
      value: z.number().describe("Target value"),
    },
    async ({ period, type, value }) => {
      try { return toolResult(await setActivityGoal(period, type, value)); }
      catch (e) { return toolError(e); }
    },
  );

  // ---------- Body / Weight ----------

  server.tool(
    "fitbit_log_weight",
    "Log a weight measurement (in the user's unit system — kg or lbs).",
    {
      weight: z.number().describe("Weight value (e.g. 180.5)"),
      date: dateParam,
      time: z.string().optional().describe("Time HH:mm:ss (optional)"),
    },
    async ({ weight, date, time }) => {
      try { return toolResult(await logWeight(weight, date, time)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_weight_log",
    "Delete a weight log entry by its weightLogId.",
    {
      weight_log_id: z.union([z.string(), z.number()]).describe("ID of the weight log to delete"),
    },
    async ({ weight_log_id }) => {
      try { return toolResult(await deleteWeightLog(weight_log_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_log_body_fat",
    "Log a body fat percentage measurement.",
    {
      fat: z.number().describe("Body fat percentage (e.g. 18.5)"),
      date: dateParam,
      time: z.string().optional().describe("Time HH:mm:ss (optional)"),
    },
    async ({ fat, date, time }) => {
      try { return toolResult(await logBodyFat(fat, date, time)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_body_fat_log",
    "Delete a body fat log entry by its fatLogId.",
    {
      fat_log_id: z.union([z.string(), z.number()]).describe("ID of the body fat log to delete"),
    },
    async ({ fat_log_id }) => {
      try { return toolResult(await deleteBodyFatLog(fat_log_id)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_set_weight_goal",
    "Set a weight goal: start date, starting weight, and target weight (all in user's unit system).",
    {
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      start_weight: z.number().describe("Starting weight"),
      weight: z.number().describe("Target weight"),
    },
    async ({ start_date, start_weight, weight }) => {
      try { return toolResult(await setWeightGoal(start_date, start_weight, weight)); }
      catch (e) { return toolError(e); }
    },
  );

  // ---------- Sleep ----------

  server.tool(
    "fitbit_log_sleep",
    "Log a sleep session. duration is in milliseconds. No overlapping sleep entries allowed.",
    {
      start_time: z.string().describe("Start time HH:mm (24h)"),
      duration: z.number().int().describe("Duration in milliseconds"),
      date: dateParam,
    },
    async ({ start_time, duration, date }) => {
      try { return toolResult(await logSleep(start_time, duration, date)); }
      catch (e) { return toolError(e); }
    },
  );

  server.tool(
    "fitbit_delete_sleep_log",
    "Delete a sleep log entry by its logId.",
    {
      log_id: z.union([z.string(), z.number()]).describe("ID of the sleep log to delete"),
    },
    async ({ log_id }) => {
      try { return toolResult(await deleteSleepLog(log_id)); }
      catch (e) { return toolError(e); }
    },
  );
}
