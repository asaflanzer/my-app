import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export function usePlayerHistory(
  leagueId: string | undefined,
  historyMemberId: string | null,
) {
  const { data: playerHistory, isLoading: historyLoading } =
    trpc.meeting.getPlayerHistory.useQuery(
      { leagueId: leagueId ?? "", memberId: historyMemberId ?? "" },
      { enabled: !!historyMemberId && !!leagueId },
    );

  const historyByMeeting = useMemo(() => {
    if (!playerHistory) return [];
    const map = new Map<number, typeof playerHistory>();
    for (const match of playerHistory) {
      const group = map.get(match.meetingNumber) ?? [];
      group.push(match);
      map.set(match.meetingNumber, group);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [playerHistory]);

  return { playerHistory, historyLoading, historyByMeeting };
}
