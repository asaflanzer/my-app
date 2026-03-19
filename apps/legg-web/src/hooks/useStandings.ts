import { useState, useMemo } from "react";
import type { IEnrichedPlayer } from "@/contexts/LeagueContext";

const INITIAL_LIMIT = 10;
const BEFORE_ME = 4;

export type ScoreboardRow =
  | { kind: "player"; player: IEnrichedPlayer; rank: number }
  | { kind: "hidden"; count: number };

export function useStandings(
  players: IEnrichedPlayer[],
  myMemberId: string | undefined,
) {
  const [standingsExpanded, setStandingsExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return b.pts - a.pts || b.wins - a.wins;
      }),
    [players],
  );

  const visibleRows = useMemo<ScoreboardRow[]>(() => {
    const meIndex = sorted.findIndex((p) => p.id === myMemberId);
    const needsTruncation = sorted.length > INITIAL_LIMIT;

    if (!needsTruncation || standingsExpanded) {
      return sorted.map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
    }
    if (meIndex < INITIAL_LIMIT) {
      return sorted
        .slice(0, INITIAL_LIMIT)
        .map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
    }
    const afterCount = INITIAL_LIMIT - BEFORE_ME - 2;
    const hiddenCount = meIndex - BEFORE_ME;
    return [
      ...sorted
        .slice(0, BEFORE_ME)
        .map((p, i) => ({ kind: "player" as const, player: p, rank: i + 1 })),
      { kind: "hidden" as const, count: hiddenCount },
      { kind: "player" as const, player: sorted[meIndex]!, rank: meIndex + 1 },
      ...sorted.slice(meIndex + 1, meIndex + 1 + afterCount).map((p, i) => ({
        kind: "player" as const,
        player: p,
        rank: meIndex + 2 + i,
      })),
    ];
  }, [sorted, myMemberId, standingsExpanded]);

  const needsTruncation = sorted.length > INITIAL_LIMIT;

  return { sorted, visibleRows, needsTruncation, standingsExpanded, setStandingsExpanded };
}
