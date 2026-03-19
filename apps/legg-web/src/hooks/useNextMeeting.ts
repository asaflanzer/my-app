import { useMemo } from "react";
import { parseISO, addDays, format, isToday } from "date-fns";
import type { RouterOutputs } from "@my-app/api";

type LeagueData = RouterOutputs["league"]["getById"];

export function useNextMeeting(
  league: LeagueData | undefined,
): { label: string; calendarUrl: string } | null {
  return useMemo(() => {
    if (!league?.startDate) return null;
    const [h, m] = (league.startTime ?? "19:00").split(":").map(Number);
    if (isNaN(h!) || isNaN(m!)) return null;
    const startDateObj = parseISO(league.startDate);
    if (isNaN(startDateObj.getTime())) return null;

    const now = new Date();
    const daysAhead = (startDateObj.getDay() - now.getDay() + 7) % 7;
    const next = addDays(now, daysAhead);
    next.setHours(h!, m!, 0, 0);

    if (next <= now) next.setDate(next.getDate() + 7);

    const timeStr = format(next, "HH:mm");
    const label = isToday(next)
      ? `Tonight at ${timeStr}`
      : `${format(next, "EEE do, yyyy")} at ${timeStr}`;

    const end = new Date(next);
    end.setHours(end.getHours() + 2);
    const calendarUrl =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(league.name + " - " + label)}` +
      `&dates=${format(next, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`;

    return { label, calendarUrl };
  }, [league?.startDate, league?.startTime, league?.name]);
}
