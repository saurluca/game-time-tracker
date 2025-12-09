"use client";
import { useEffect, useState } from "react";

function formatTime(tenths: number) {
  const totalSeconds = Math.floor(tenths / 10);
  const tenthsPart = tenths % 10;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}:${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenthsPart}`;
}

export default function Home() {
  const [gameTime, setGameTime] = useState(0);
  const [shouldTrack, setShouldTrack] = useState(false);

  function handleTimer() {
    setShouldTrack(!shouldTrack);
  }

  useEffect(() => {
    if (!shouldTrack) return;

    const intervalId = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 100);

    return () => clearInterval(intervalId);
  }, [shouldTrack]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Game Time Tracker
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Track your game time and improve your skills.
          </p>
          <button
            onClick={handleTimer}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
          >
            Start Timer
          </button>
          <p>{formatTime(gameTime)}</p>
        </div>
        {/* <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <button className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]">
            hello
          </button>
        </div> */}
      </main>
    </div>
  );
}
