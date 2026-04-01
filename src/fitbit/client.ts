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
