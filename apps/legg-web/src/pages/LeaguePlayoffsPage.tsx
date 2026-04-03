import { Navigate, useParams } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { LeagueGameHeader } from "@/components/league/LeagueGameHeader";
import { LeagueHero } from "@/components/league/LeagueHero";
import { PlayoffBracket } from "@/components/league/PlayoffBracket";
import { trpc } from "@/lib/trpc";

export const LeaguePlayoffsPage = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { isLoading: leagueLoading, league, myMemberId, isAdmin, players } = useLeagueContext();
  const { leagueId } = useParams<{ leagueId: string }>();

  const { data: playoffData, isLoading: bracketLoading } =
    trpc.playoffs.getBracket.useQuery(
      { leagueId: leagueId ?? "" },
      { enabled: !!leagueId },
    );

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

      {/* Active match hero — same as the regular game page */}
      <LeagueHero />

      {/* Bracket */}
      {bracketLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : playoffData?.bracket ? (
        <PlayoffBracket
          bracket={playoffData.bracket}
          myMemberId={myMemberId}
          raceTo={playoffData.raceTo}
          gameType={playoffData.gameType}
          isAdmin={isAdmin}
          leagueId={leagueId ?? ""}
          players={players.map((p) => ({ memberId: p.id, status: p.status }))}
        />
      ) : (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {league?.isAdmin
            ? "No bracket yet. Use the Admin panel to initialise the playoffs."
            : "The playoff bracket hasn't been set up yet. Check back soon!"}
        </div>
      )}
    </div>
  );
};
