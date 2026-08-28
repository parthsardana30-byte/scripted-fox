"use client";

import { useSyncExternalStore } from "react";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function subscribe() {
  return () => undefined;
}

function getClientGreeting() {
  return greetingForHour(new Date().getHours());
}

function getServerGreeting() {
  return "Welcome";
}

export function DashboardGreeting({ userName }: { userName: string }) {
  const greeting = useSyncExternalStore(subscribe, getClientGreeting, getServerGreeting);

  return <h1>{greeting}, {userName}</h1>;
}
