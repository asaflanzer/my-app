import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { RouterOutputs } from "@my-app/api";
import { trpc } from "@/lib/trpc";

type LeagueData = RouterOutputs["league"]["getById"];

interface ILeagueContext {
  league: LeagueData | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  myMemberId: string | undefined;
  refetch: () => void;
}

const LeagueContext = createContext<ILeagueContext | null>(null);

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const { leagueId } = useParams<{ leagueId: string }>();

  const { data: league, isLoading, refetch } = trpc.league.getById.useQuery(
    { leagueId: leagueId ?? "" },
    { enabled: !!leagueId },
  );

  return (
    <LeagueContext.Provider
      value={{
        league,
        isLoading,
        isAdmin: league?.isAdmin ?? false,
        myMemberId: league?.myMemberId,
        refetch,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeagueContext = (): ILeagueContext => {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeagueContext must be used within LeagueProvider");
  return ctx;
};
