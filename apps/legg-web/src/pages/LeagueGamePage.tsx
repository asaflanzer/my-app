import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { LeagueGameHeader } from "@/components/league/LeagueGameHeader";
import { LeagueHero } from "@/components/league/LeagueHero";
import { LeagueStandings } from "@/components/league/LeagueStandings";
import { LeagueTables } from "@/components/league/LeagueTables";

export const LeagueGamePage = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { isLoading: leagueLoading } = useLeagueContext();

  if (sessionPending || leagueLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="w-full sm:max-w-sm sm:mx-auto text-foreground pb-16">
      <LeagueGameHeader />
      <LeagueHero />
      <LeagueStandings />
      <LeagueTables />
    </div>
  );
};
