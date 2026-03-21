import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { RouterOutputs } from "@my-app/api";
import { trpc } from "@/lib/trpc";

type LeagueData = RouterOutputs["league"]["getById"];
type ActiveMeetingData = RouterOutputs["meeting"]["getActive"];
type ActiveTable = NonNullable<ActiveMeetingData>["tables"][number];

export type PlayerStatus = "available" | "ready" | "playing";

export interface IEnrichedPlayer {
  id: string;
  name: string;
  wins: number;
  losses: number;
  games: number;
  score: number;
  disabled: boolean;
  isQualified: boolean;
  status: PlayerStatus;
}

interface ILeagueContext {
  league: LeagueData | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  myMemberId: string | undefined;
  refetch: () => void;
  activeMeeting: ActiveMeetingData | undefined;
  refetchMeeting: () => void;
  players: IEnrichedPlayer[];
  myPlayer: IEnrichedPlayer | undefined;
  myActiveTable: ActiveTable | undefined;
}

const LeagueContext = createContext<ILeagueContext | null>(null);

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const { leagueId } = useParams<{ leagueId: string }>();

  const {
    data: league,
    isLoading,
    refetch,
  } = trpc.league.getById.useQuery(
    { leagueId: leagueId ?? "" },
    { enabled: !!leagueId },
  );

  const { data: activeMeeting, refetch: refetchMeeting } =
    trpc.meeting.getActive.useQuery(
      { leagueId: leagueId ?? "" },
      {
        enabled: !!leagueId && !!league?.hasStarted,
        refetchInterval: (query) => (query.state.data ? 5000 : 30000),
      },
    );

  const myMemberId = league?.myMemberId;

  const players = useMemo<IEnrichedPlayer[]>(() => {
    if (!league) return [];
    const statusMap = new Map<string, PlayerStatus>();
    if (activeMeeting) {
      for (const mp of activeMeeting.players) {
        statusMap.set(mp.memberId, mp.status as PlayerStatus);
      }
    }
    return league.members.map((m) => ({
      id: m.id,
      name: m.userName,
      wins: m.wins,
      losses: m.losses,
      games: m.games,
      score: m.score,
      disabled: m.disabled,
      isQualified: m.isQualified,
      status: statusMap.get(m.id) ?? ("available" as PlayerStatus),
    }));
  }, [league, activeMeeting]);

  const myPlayer = useMemo(
    () => (myMemberId ? players.find((p) => p.id === myMemberId) : undefined),
    [players, myMemberId],
  );

  const myActiveTable = useMemo(
    () =>
      activeMeeting?.tables.find(
        (t) =>
          (t.player1Id === myMemberId || t.player2Id === myMemberId) &&
          t.status === "active",
      ),
    [activeMeeting, myMemberId],
  );

  return (
    <LeagueContext.Provider
      value={{
        league,
        isLoading,
        isAdmin: league?.isAdmin ?? false,
        myMemberId,
        refetch,
        activeMeeting,
        refetchMeeting,
        players,
        myPlayer,
        myActiveTable,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeagueContext = (): ILeagueContext => {
  const ctx = useContext(LeagueContext);
  if (!ctx)
    throw new Error("useLeagueContext must be used within LeagueProvider");
  return ctx;
};
