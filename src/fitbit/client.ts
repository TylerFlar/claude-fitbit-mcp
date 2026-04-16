import { FITBIT_API_BASE } from "../config.js";
import { loadClientCredentials } from "../auth/client-credentials.js";
import { refreshTokens } from "../auth/oauth.js";
import { loadAccount, saveAccount } from "../auth/token-store.js";
import type { Credentials } from "../types.js";

let cachedTokens: Credentials | null = null;

async function getAccessToken(): Promise<string> {
  let account = await loadAccount();
  if (!account) throw new Error("Not connected. Use fitbit_connect to authenticate.");

  if (cachedTokens) {
    account = { ...account, tokens: cachedTokens };
  }

  // Refresh if expired or expiring within 5 minutes
  if (account.tokens.expires_at < Date.now() + 5 * 60 * 1000) {
    const creds = await loadClientCredentials();
    const newTokens = await refreshTokens(creds.client_id, creds.client_secret, account.tokens.refresh_token);
    await saveAccount({ ...account, tokens: newTokens });
    cachedTokens = newTokens;
    return newTokens.access_token;
  }

  cachedTokens = account.tokens;
  return account.tokens.access_token;
}

async function fitbitGet(path: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${FITBIT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fitbit API error (${res.status}): ${text}`);
  }

  return res.json();
}

async function fitbitPost(path: string, params: Record<string, string | number | undefined>): Promise<any> {
  const token = await getAccessToken();
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  const res = await fetch(`${FITBIT_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fitbit API error (${res.status}): ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : { ok: true, status: res.status };
}

async function fitbitDelete(path: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${FITBIT_API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fitbit API error (${res.status}): ${text}`);
  }
  return { ok: true, status: res.status };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Profile ---

export async function getProfile(): Promise<any> {
  const data = await fitbitGet("/1/user/-/profile.json");
  const u = data.user;
  return {
    displayName: u.displayName,
    age: u.age,
    height: u.height,
    weight: u.weight,
    averageDailySteps: u.averageDailySteps,
    memberSince: u.memberSince,
    timezone: u.timezone,
  };
}

// --- Sleep ---

export async function getSleep(date?: string): Promise<any> {
  const d = date ?? today();
  const data = await fitbitGet(`/1.2/user/-/sleep/date/${d}.json`);
  return {
    summary: data.summary,
    sleep: (data.sleep ?? []).map((s: any) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      efficiency: s.efficiency,
      minutesAsleep: s.minutesAsleep,
      minutesAwake: s.minutesAwake,
      stages: s.levels?.summary,
      isMainSleep: s.isMainSleep,
    })),
  };
}

export async function getSleepRange(startDate: string, endDate: string): Promise<any> {
  return fitbitGet(`/1.2/user/-/sleep/date/${startDate}/${endDate}.json`);
}

// --- Heart Rate ---

export async function getHeartRate(date?: string): Promise<any> {
  const d = date ?? today();
  const data = await fitbitGet(`/1/user/-/activities/heart/date/${d}/1d.json`);
  const hr = data["activities-heart"]?.[0]?.value;
  return {
    date: d,
    restingHeartRate: hr?.restingHeartRate,
    zones: hr?.heartRateZones?.map((z: any) => ({
      name: z.name,
      min: z.min,
      max: z.max,
      minutes: z.minutes,
      caloriesOut: z.caloriesOut,
    })),
  };
}

export async function getHeartRateIntraday(date?: string, detailLevel = "5min"): Promise<any> {
  const d = date ?? today();
  return fitbitGet(`/1/user/-/activities/heart/date/${d}/1d/${detailLevel}.json`);
}

// --- Activity / Steps ---

export async function getDailyActivity(date?: string): Promise<any> {
  const d = date ?? today();
  const data = await fitbitGet(`/1/user/-/activities/date/${d}.json`);
  return {
    summary: {
      steps: data.summary?.steps,
      caloriesOut: data.summary?.caloriesOut,
      activeMinutes: data.summary?.fairlyActiveMinutes + data.summary?.veryActiveMinutes,
      sedentaryMinutes: data.summary?.sedentaryMinutes,
      floors: data.summary?.floors,
      distance: data.summary?.distances?.find((d: any) => d.activity === "total")?.distance,
      activityCalories: data.summary?.activityCalories,
    },
    goals: data.goals,
  };
}

export async function getActivityLog(beforeDate?: string, limit = 10): Promise<any> {
  const params = new URLSearchParams({
    beforeDate: beforeDate ?? today(),
    sort: "desc",
    limit: String(limit),
    offset: "0",
  });
  const data = await fitbitGet(`/1/user/-/activities/list.json?${params}`);
  return (data.activities ?? []).map((a: any) => ({
    name: a.activityName,
    startTime: a.startTime,
    duration: a.duration,
    calories: a.calories,
    steps: a.steps,
    distance: a.distance,
    heartRateZones: a.heartRateZones,
    activeDuration: a.activeDuration,
  }));
}

// --- Body / Weight ---

export async function getWeight(startDate?: string, endDate?: string): Promise<any> {
  const start = startDate ?? today();
  const end = endDate ?? start;
  const data = await fitbitGet(`/1/user/-/body/log/weight/date/${start}/${end}.json`);
  return (data.weight ?? []).map((w: any) => ({
    date: w.date,
    time: w.time,
    weight: w.weight,
    bmi: w.bmi,
    fat: w.fat,
  }));
}

// --- SpO2 ---

export async function getSpO2(date?: string): Promise<any> {
  const d = date ?? today();
  return fitbitGet(`/1/user/-/spo2/date/${d}.json`);
}

// --- Breathing Rate ---

export async function getBreathingRate(date?: string): Promise<any> {
  const d = date ?? today();
  return fitbitGet(`/1/user/-/br/date/${d}.json`);
}

// --- Skin Temperature ---

export async function getSkinTemperature(date?: string): Promise<any> {
  const d = date ?? today();
  return fitbitGet(`/1/user/-/temp/skin/date/${d}.json`);
}

// --- Nutrition / Food Logging ---

export async function getFoodLog(date?: string): Promise<any> {
  const d = date ?? today();
  const data = await fitbitGet(`/1/user/-/foods/log/date/${d}.json`);
  return {
    date: d,
    foods: (data.foods ?? []).map((f: any) => ({
      meal: f.loggedFood?.mealTypeId,
      name: f.loggedFood?.name,
      brand: f.loggedFood?.brand,
      amount: f.loggedFood?.amount,
      unit: f.loggedFood?.unit?.name,
      calories: f.loggedFood?.calories,
      nutritionalValues: f.nutritionalValues,
    })),
    summary: data.summary,
  };
}

export async function getNutritionSummary(date?: string): Promise<any> {
  const d = date ?? today();
  const data = await fitbitGet(`/1/user/-/foods/log/date/${d}.json`);
  return {
    date: d,
    ...data.summary,
  };
}

export async function getNutritionTimeseries(nutrient: string, startDate: string, endDate: string): Promise<any> {
  return fitbitGet(`/1/user/-/foods/log/${nutrient}/date/${startDate}/${endDate}.json`);
}

export async function getWaterLog(date?: string): Promise<any> {
  const d = date ?? today();
  return fitbitGet(`/1/user/-/foods/log/water/date/${d}.json`);
}

// --- Activity Goals & Timeseries ---

export async function getActivityGoals(period: string): Promise<any> {
  return fitbitGet(`/1/user/-/activities/goals/${period}.json`);
}

export async function getActivityTimeseries(resource: string, startDate: string, endDate: string): Promise<any> {
  return fitbitGet(`/1/user/-/activities/${resource}/date/${startDate}/${endDate}.json`);
}

export async function getAZMTimeseries(startDate: string, endDate: string): Promise<any> {
  return fitbitGet(`/1/user/-/activities/active-zone-minutes/date/${startDate}/${endDate}.json`);
}

// --- Daily Summary (combines multiple endpoints) ---

export async function getDailySummary(date?: string): Promise<any> {
  const d = date ?? today();
  const [activity, sleep, heartRate] = await Promise.all([
    getDailyActivity(d).catch(() => null),
    getSleep(d).catch(() => null),
    getHeartRate(d).catch(() => null),
  ]);

  return {
    date: d,
    activity: activity?.summary,
    activityGoals: activity?.goals,
    sleep: sleep ? {
      totalMinutesAsleep: sleep.summary?.totalMinutesAsleep,
      totalSleepRecords: sleep.summary?.totalSleepRecords,
      stages: sleep.summary?.stages,
      mainSleep: sleep.sleep?.find((s: any) => s.isMainSleep),
    } : null,
    heartRate: heartRate ? {
      restingHeartRate: heartRate.restingHeartRate,
      zones: heartRate.zones,
    } : null,
  };
}

// ============================================================
// WRITE ENDPOINTS
// ============================================================

// --- Food / Nutrition writes ---

export interface LogFoodInput {
  foodId?: number | string;
  foodName?: string;
  brandName?: string;
  calories?: number;
  mealTypeId: number;
  unitId: number;
  amount: number;
  date?: string;
  favorite?: boolean;
}

export async function logFood(input: LogFoodInput): Promise<any> {
  if (!input.foodId && !input.foodName) {
    throw new Error("Provide either foodId (from Fitbit food DB) or foodName (free-text).");
  }
  if (input.foodName && input.calories === undefined) {
    throw new Error("When logging by foodName, calories is required.");
  }
  return fitbitPost("/1/user/-/foods/log.json", {
    foodId: input.foodId,
    foodName: input.foodName,
    brandName: input.brandName,
    calories: input.calories,
    mealTypeId: input.mealTypeId,
    unitId: input.unitId,
    amount: input.amount,
    date: input.date ?? today(),
    favorite: input.favorite !== undefined ? String(input.favorite) : undefined,
  });
}

export async function deleteFoodLog(foodLogId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/foods/log/${foodLogId}.json`);
}

export async function logWater(amount: number, unit?: "ml" | "fl oz" | "cup", date?: string): Promise<any> {
  return fitbitPost("/1/user/-/foods/log/water.json", {
    amount,
    unit,
    date: date ?? today(),
  });
}

export async function deleteWaterLog(waterLogId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/foods/log/water/${waterLogId}.json`);
}

export interface CreateCustomFoodInput {
  name: string;
  defaultFoodMeasurementUnitId: number;
  defaultServingSize: number;
  calories: number;
  formType?: "LIQUID" | "DRY";
  description?: string;
}

export async function createCustomFood(input: CreateCustomFoodInput): Promise<any> {
  return fitbitPost("/1/user/-/foods.json", {
    name: input.name,
    defaultFoodMeasurementUnitId: input.defaultFoodMeasurementUnitId,
    defaultServingSize: input.defaultServingSize,
    calories: input.calories,
    formType: input.formType,
    description: input.description,
  });
}

export async function deleteCustomFood(foodId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/foods/${foodId}.json`);
}

export interface SetFoodGoalInput {
  calories?: number;
  intensity?: "MAINTENANCE" | "EASIER" | "MEDIUM" | "KINDAHARD" | "HARDER";
  personalized?: boolean;
}

export async function setFoodGoal(input: SetFoodGoalInput): Promise<any> {
  if (input.calories === undefined && !input.intensity) {
    throw new Error("Provide either calories or intensity.");
  }
  return fitbitPost("/1/user/-/foods/log/goal.json", {
    calories: input.calories,
    intensity: input.intensity,
    personalized: input.personalized !== undefined ? String(input.personalized) : undefined,
  });
}

export async function setWaterGoal(target: number): Promise<any> {
  return fitbitPost("/1/user/-/foods/log/water/goal.json", { target });
}

// --- Activity writes ---

export interface LogActivityInput {
  activityId?: number;
  activityName?: string;
  manualCalories?: number;
  startTime: string;
  durationMillis: number;
  date?: string;
  distance?: number;
  distanceUnit?: string;
}

export async function logActivity(input: LogActivityInput): Promise<any> {
  if (!input.activityId && !input.activityName) {
    throw new Error("Provide either activityId or activityName.");
  }
  if (input.activityName && input.manualCalories === undefined) {
    throw new Error("When logging by activityName, manualCalories is required.");
  }
  return fitbitPost("/1/user/-/activities.json", {
    activityId: input.activityId,
    activityName: input.activityName,
    manualCalories: input.manualCalories,
    startTime: input.startTime,
    durationMillis: input.durationMillis,
    date: input.date ?? today(),
    distance: input.distance,
    distanceUnit: input.distanceUnit,
  });
}

export async function deleteActivityLog(activityLogId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/activities/${activityLogId}.json`);
}

export async function setActivityGoal(
  period: "daily" | "weekly",
  type: "activeMinutes" | "activeZoneMinutes" | "caloriesOut" | "distance" | "floors" | "steps",
  value: number,
): Promise<any> {
  return fitbitPost(`/1/user/-/activities/goals/${period}.json`, { type, value });
}

// --- Body / weight writes ---

export async function logWeight(weight: number, date?: string, time?: string): Promise<any> {
  return fitbitPost("/1/user/-/body/log/weight.json", {
    weight,
    date: date ?? today(),
    time,
  });
}

export async function deleteWeightLog(weightLogId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/body/log/weight/${weightLogId}.json`);
}

export async function logBodyFat(fat: number, date?: string, time?: string): Promise<any> {
  return fitbitPost("/1/user/-/body/log/fat.json", {
    fat,
    date: date ?? today(),
    time,
  });
}

export async function deleteBodyFatLog(fatLogId: string | number): Promise<any> {
  return fitbitDelete(`/1/user/-/body/log/fat/${fatLogId}.json`);
}

export async function setWeightGoal(startDate: string, startWeight: number, weight: number): Promise<any> {
  return fitbitPost("/1/user/-/body/log/weight/goal.json", {
    startDate,
    startWeight,
    weight,
  });
}

// --- Sleep writes ---

export async function logSleep(startTime: string, duration: number, date?: string): Promise<any> {
  return fitbitPost("/1.2/user/-/sleep.json", {
    startTime,
    duration,
    date: date ?? today(),
  });
}

export async function deleteSleepLog(logId: string | number): Promise<any> {
  return fitbitDelete(`/1.2/user/-/sleep/${logId}.json`);
}
