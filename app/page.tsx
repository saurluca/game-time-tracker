"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import timeEquivalentsData from "./time-equivalents.json";

// Storage keys
const STORAGE_KEY_DAILY = "game-time-daily";
const STORAGE_KEY_OVERALL = "game-time-overall";

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
  const sessionTimeRef = useRef(0);

  // Load data from localStorage after mount to avoid hydration mismatch
  // Using useLayoutEffect to sync with external store (localStorage) before paint
  useEffect(() => {
    const loadedDailyTotals = getDailyTotals();
    const loadedOverallTotal = getOverallTotal();
    if (Object.keys(loadedDailyTotals).length > 0 || loadedOverallTotal > 0) {
      // Batch state updates to minimize renders
      requestAnimationFrame(() => {
        setDailyTotals(loadedDailyTotals);
        setOverallTotal(loadedOverallTotal);
      });
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isTracking) return;

    const intervalId = setInterval(() => {
      setSessionTime((prev) => {
        const newTime = prev + 1;
        sessionTimeRef.current = newTime;
        return newTime;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [isTracking]);

  function handleTimer() {
    if (isTracking) {
      // Stop tracking and save session
      const timeToSave = sessionTimeRef.current;
      if (timeToSave > 0) {
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

      setIsTracking(false);
      setSessionTime(0);
      sessionTimeRef.current = 0;
    } else {
      setIsTracking(true);
    }
  }

  const todayTotal = calculateTodayTotal(dailyTotals);
  const weekTotal = calculateWeekTotal(dailyTotals);
  const yesterdayTotal = calculateYesterdayTotal(dailyTotals);
  const weekAverage = calculateWeekAverage(dailyTotals);
  const overallAverage = calculateOverallAverage(dailyTotals);

  // Check if there are entries in the current week
  const weekDates = getDatesInWeek();
  const hasWeekEntries = weekDates.some((date) => dailyTotals[date] > 0);

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
            <button
              onClick={handleTimer}
              className="w-full rounded-lg border border-black bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:w-auto sm:px-8"
            >
              {isTracking ? "Stop Session" : "Start Session"}
            </button>
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
        {todayTotal > 0 && weekAverage > 0 && hasWeekEntries && (
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
