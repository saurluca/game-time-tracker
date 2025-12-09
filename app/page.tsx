"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import timeEquivalentsData from "./time-equivalents.json";

// Storage keys
const STORAGE_KEY_DAILY = "game-time-daily";
const STORAGE_KEY_OVERALL = "game-time-overall";
const STORAGE_KEY_SESSION_START = "game-time-session-start";

// Constants
const MAX_SESSION_HOURS = 24;
const MAX_SESSION_TENTHS = MAX_SESSION_HOURS * 60 * 60 * 10; // 24 hours in tenths

// Data structures
interface DailyTotals {
  [date: string]: number; // date string -> time in tenths of seconds
}

// localStorage utilities
function getDailyTotals(): DailyTotals {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_DAILY);
  return stored ? JSON.parse(stored) : {};
}

function saveDailyTotals(totals: DailyTotals): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(totals));
}

function getOverallTotal(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY_OVERALL);
  return stored ? parseInt(stored, 10) : 0;
}

function saveOverallTotal(total: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_OVERALL, total.toString());
}

// Session start timestamp utilities
function getSessionStart(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY_SESSION_START);
  return stored ? parseInt(stored, 10) : null;
}

function saveSessionStart(timestamp: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_SESSION_START, timestamp.toString());
}

function clearSessionStart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_SESSION_START);
}

function calculateElapsedTenths(startTimestamp: number): number {
  const now = Date.now();
  const elapsedMs = now - startTimestamp;
  return Math.floor(elapsedMs / 100); // Convert to tenths of seconds
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// Time formatting functions
// Format for main timer: hours:minutes:seconds.tenths
function formatTime(tenths: number): string {
  const totalSeconds = Math.floor(tenths / 10);
  const tenthsPart = tenths % 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenthsPart}`;
}

// Format for totals: hours:minutes only
function formatTimeHoursMinutes(tenths: number): string {
  const totalSeconds = Math.floor(tenths / 10);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function formatTimeShort(tenths: number): string {
  const totalSeconds = Math.floor(tenths / 10);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Time-equivalent activities based on hours spent
interface TimeEquivalent {
  hours: number;
  activities: string[];
}

const TIME_EQUIVALENTS: TimeEquivalent[] = timeEquivalentsData;

function getTimeEquivalent(hours: number): string | null {
  if (hours < 10) return null;

  // Find the appropriate category (use the highest threshold that applies)
  let selectedCategory: TimeEquivalent | null = null;
  for (const category of TIME_EQUIVALENTS) {
    if (hours >= category.hours) {
      selectedCategory = category;
    } else {
      break;
    }
  }

  if (!selectedCategory) return null;

  // Select a random activity from the category
  const randomIndex = Math.floor(
    Math.random() * selectedCategory.activities.length
  );
  return selectedCategory.activities[randomIndex];
}

// Date utilities
function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

function getDatesInWeek(date: Date = new Date()): string[] {
  const start = getStartOfWeek(date);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(getDateString(d));
  }
  return dates;
}

// Stats calculations
function calculateTodayTotal(dailyTotals: DailyTotals): number {
  return dailyTotals[getDateString()] || 0;
}

function calculateWeekTotal(dailyTotals: DailyTotals): number {
  const weekDates = getDatesInWeek();
  return weekDates.reduce((sum, date) => sum + (dailyTotals[date] || 0), 0);
}

function calculateYesterdayTotal(dailyTotals: DailyTotals): number {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dailyTotals[getDateString(yesterday)] || 0;
}

function calculateWeekAverage(dailyTotals: DailyTotals): number {
  const weekDates = getDatesInWeek();
  const weekTotal = weekDates.reduce(
    (sum, date) => sum + (dailyTotals[date] || 0),
    0
  );
  return weekTotal / 7;
}

function calculateOverallAverage(dailyTotals: DailyTotals): number {
  const datesWithData = Object.keys(dailyTotals);
  if (datesWithData.length === 0) return 0;
  const total = datesWithData.reduce(
    (sum, date) => sum + (dailyTotals[date] || 0),
    0
  );
  return total / datesWithData.length;
}

export default function Home() {
  const [sessionTime, setSessionTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({});
  const [overallTotal, setOverallTotal] = useState(0);
  const sessionStartRef = useRef<number | null>(null);

  // Load data from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const loadedDailyTotals = getDailyTotals();
    const loadedOverallTotal = getOverallTotal();
    const savedSessionStart = getSessionStart();

    // Batch state updates to minimize renders
    requestAnimationFrame(() => {
      if (Object.keys(loadedDailyTotals).length > 0 || loadedOverallTotal > 0) {
        setDailyTotals(loadedDailyTotals);
        setOverallTotal(loadedOverallTotal);
      }

      // Restore active session if exists
      if (savedSessionStart) {
        const elapsed = calculateElapsedTenths(savedSessionStart);

        // Auto-discard sessions longer than 24 hours
        if (elapsed > MAX_SESSION_TENTHS) {
          clearSessionStart();
          return;
        }

        sessionStartRef.current = savedSessionStart;
        setSessionTime(elapsed);
        setIsTracking(true);
      }
    });
  }, []);

  // Timer effect - updates display based on start timestamp
  useEffect(() => {
    if (!isTracking || !sessionStartRef.current) return;

    const intervalId = setInterval(() => {
      if (sessionStartRef.current) {
        const elapsed = calculateElapsedTenths(sessionStartRef.current);

        // Auto-discard if session exceeds 24 hours
        if (elapsed > MAX_SESSION_TENTHS) {
          clearSessionStart();
          sessionStartRef.current = null;
          setIsTracking(false);
          setSessionTime(0);
          return;
        }

        setSessionTime(elapsed);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isTracking]);

  function handleTimer() {
    if (isTracking) {
      // Stop tracking and save session
      if (sessionStartRef.current) {
        const timeToSave = calculateElapsedTenths(sessionStartRef.current);

        // Only save if within 24-hour limit
        if (timeToSave > 0 && timeToSave <= MAX_SESSION_TENTHS) {
          const today = getDateString();

          setDailyTotals((prevTotals) => {
            const newDailyTotals = {
              ...prevTotals,
              [today]: (prevTotals[today] || 0) + timeToSave,
            };
            saveDailyTotals(newDailyTotals);
            return newDailyTotals;
          });

          setOverallTotal((prevTotal) => {
            const newOverallTotal = prevTotal + timeToSave;
            saveOverallTotal(newOverallTotal);
            return newOverallTotal;
          });
        }
      }

      clearSessionStart();
      sessionStartRef.current = null;
      setIsTracking(false);
      setSessionTime(0);
    } else {
      // Start new session with timestamp
      const now = Date.now();
      sessionStartRef.current = now;
      saveSessionStart(now);
      setIsTracking(true);
    }
  }

  function handleDiscardSession() {
    clearSessionStart();
    sessionStartRef.current = null;
    setIsTracking(false);
    setSessionTime(0);
  }

  const todayTotal = calculateTodayTotal(dailyTotals);
  const weekTotal = calculateWeekTotal(dailyTotals);
  const yesterdayTotal = calculateYesterdayTotal(dailyTotals);
  const weekAverage = calculateWeekAverage(dailyTotals);
  const overallAverage = calculateOverallAverage(dailyTotals);

  // Check if there are multiple days with entries this week (not just today)
  const weekDates = getDatesInWeek();
  const weekDaysWithEntries = weekDates.filter(
    (date) => dailyTotals[date] > 0
  ).length;
  const hasMultipleWeekEntries = weekDaysWithEntries > 1;

  // Calculate overall hours for time equivalent
  const overallHours = Math.floor(overallTotal / 36000); // Convert tenths to hours
  const timeEquivalent = useMemo(
    () => getTimeEquivalent(overallHours),
    [overallHours]
  );

  // Comparison calculations
  const todayVsYesterday = todayTotal - yesterdayTotal;
  const todayVsWeekAverage = todayTotal - weekAverage;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans dark:bg-black">
      <main className="flex w-full max-w-4xl flex-col gap-12 px-6 py-16 sm:px-8 md:px-12 lg:px-16">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-white sm:text-5xl">
            Game Time Tracker
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Track your gaming sessions and stay mindful of your time.
          </p>
        </div>

        {/* Session Timer */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Current Session
            </h2>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-6 text-center">
              <div className="text-6xl font-mono font-semibold tracking-tight text-black dark:text-white sm:text-7xl md:text-8xl">
                {formatTime(sessionTime)}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleTimer}
                className="w-full rounded-lg border border-black bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:w-auto sm:px-8"
              >
                {isTracking ? "Stop Session" : "Start Session"}
              </button>
              {isTracking && (
                <button
                  onClick={handleDiscardSession}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-6 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-red-500 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-500 dark:hover:text-red-400 sm:w-auto sm:px-8"
                >
                  Discard Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Today */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Today
            </div>
            <div
              className="mb-2 text-3xl font-semibold tracking-tight text-black dark:text-white"
              suppressHydrationWarning
            >
              {formatTimeHoursMinutes(todayTotal)}
            </div>
            {yesterdayTotal > 0 && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {todayVsYesterday >= 0 ? (
                  <span className="text-red-600 dark:text-red-400">
                    +{formatTimeShort(Math.abs(todayVsYesterday))} vs yesterday
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    {formatTimeShort(Math.abs(todayVsYesterday))} less than
                    yesterday
                  </span>
                )}
              </div>
            )}
          </div>

          {/* This Week */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              This Week
            </div>
            <div
              className="mb-2 text-3xl font-semibold tracking-tight text-black dark:text-white"
              suppressHydrationWarning
            >
              {formatTimeHoursMinutes(weekTotal)}
            </div>
            {weekAverage > 0 && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Avg: {formatTimeShort(Math.floor(weekAverage))} per day
              </div>
            )}
          </div>

          {/* Overall */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Overall
            </div>
            <div
              className="mb-2 text-3xl font-semibold tracking-tight text-black dark:text-white"
              suppressHydrationWarning
            >
              {formatTimeHoursMinutes(overallTotal)}
            </div>
            {overallAverage > 0 && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Avg: {formatTimeShort(Math.floor(overallAverage))} per day
              </div>
            )}
          </div>
        </div>

        {/* Time Equivalent Message */}
        {timeEquivalent && overallHours >= 10 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-medium">
                With {overallHours} hours of gaming time, you could have:
              </span>
              <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {timeEquivalent}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Message */}
        {todayTotal > 0 && weekAverage > 0 && hasMultipleWeekEntries && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              {todayVsWeekAverage >= 0 ? (
                <span>
                  You&apos;ve played{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatTimeShort(Math.abs(todayVsWeekAverage))} more
                  </span>{" "}
                  today than your weekly average. Consider taking a break.
                </span>
              ) : (
                <span>
                  You&apos;re{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatTimeShort(Math.abs(todayVsWeekAverage))} under
                  </span>{" "}
                  your weekly average today. Good balance!
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
