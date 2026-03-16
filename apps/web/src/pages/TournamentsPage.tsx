import { useNavigate, Navigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  swiss: "Swiss",
  free_for_all: "Free for All",
  leaderboard: "Leaderboard",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-700",
};

export const TournamentsPage = () => {
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();

  const { data: tournamentList, isLoading } = trpc.tournament.list.useQuery(undefined, {
    enabled: !!session,
  });

  if (sessionPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const myTournaments = tournamentList?.filter((t) => t.hostId === session.user.id) ?? [];
  const publicTournaments = tournamentList?.filter(
    (t) => t.hostId !== session.user.id && (t.status === "published" || t.status === "in_progress")
  ) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-8 py-4 border-b">
        <button onClick={() => navigate("/")} className="text-xl font-bold hover:opacity-80">
          Game On
        </button>
        <Button size="sm" onClick={() => navigate("/create-tournament")}>
          + Host Tournament
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-10 p-8">
        {myTournaments.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">My Tournaments</h2>
            <div className="space-y-3">
              {myTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Open Tournaments</h2>
          {publicTournaments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open tournaments right now.</p>
          ) : (
            <div className="space-y-3">
              {publicTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    gameType: string;
    format: string;
    status: string;
    startDate: Date | string;
    isFree: boolean;
  };
  onClick: () => void;
}

const TournamentCard = ({ tournament, onClick }: TournamentCardProps) => (
  <Card
    className="cursor-pointer transition-shadow hover:shadow-md"
    onClick={onClick}
  >
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-base">{tournament.name}</CardTitle>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[tournament.status] ?? "bg-muted"}`}>
          {tournament.status.replace("_", " ")}
        </span>
      </div>
    </CardHeader>
    <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>{tournament.gameType}</span>
      <span>·</span>
      <span>{FORMAT_LABELS[tournament.format] ?? tournament.format}</span>
      <span>·</span>
      <span>
        {new Date(tournament.startDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
      <span>·</span>
      <span>{tournament.isFree ? "Free" : "Paid"}</span>
    </CardContent>
  </Card>
);
