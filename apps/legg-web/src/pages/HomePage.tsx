import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { isAdmin } from "@/lib/admin";
import eightBallUrl from "@/assets/8ball.svg";

export const HomePage = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState("");

  const { data: leagues, isLoading: leaguesLoading } =
    trpc.league.list.useQuery(undefined, { enabled: !!session });

  const { data: availableLeagues, isLoading: availableLoading } =
    trpc.league.listAvailable.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    if (availableLeagues && availableLeagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(availableLeagues[0]!.id);
    }
  }, [availableLeagues, selectedLeagueId]);

  const createLeague = trpc.league.create.useMutation({
    onSuccess: (data) => {
      toast("League created!");
      navigate(`/league/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const signUp = trpc.league.signUp.useMutation({
    onSuccess: () => {
      toast("Signed up! Waiting for host approval.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
        <div className="h-24 w-24">
          <img
            src={eightBallUrl}
            alt="8 ball"
            className="h-full w-full"
            style={{
              animation: "ball-spin-load 1.2s ease-out forwards",
            }}
          />
        </div>

        <h1
          className="text-4xl font-bold tracking-widest text-white uppercase font-mono"
          style={{
            opacity: 0,
            animation: "fade-down 0.5s ease-out 1.2s forwards",
          }}
        >
          Legg
        </h1>
        <h2
          className="text-lg text-gray-400 uppercase tracking-widest"
          style={{
            opacity: 0,
            animation: "fade-down 0.5s ease-out 1.6s forwards",
          }}
        >
          <div className="flex items-center gap-2">
            Pool League & Tournaments
          </div>
        </h2>

        <div
          style={{
            opacity: 0,
            animation: "fade-up 0.4s ease-out 2s forwards",
          }}
        >
          <Button
            size="lg"
            className="px-12 text-base uppercase tracking-widest text-black font-mono"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  const canCreateLeague = isAdmin(session?.user.email);

  // Logged in — auto-redirect if in exactly 1 league and no available leagues to join
  if (
    !leaguesLoading &&
    !availableLoading &&
    leagues &&
    leagues.length === 1 &&
    (!availableLeagues || availableLeagues.length === 0)
  ) {
    return <Navigate to={`/league/${leagues[0]!.id}`} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0a0a0a] px-4 pt-16 gap-8">
      <h1 className="text-3xl font-bold tracking-widest uppercase font-mono">
        Legg
      </h1>

      {leaguesLoading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      ) : leagues && leagues.length > 0 ? (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono text-center">
            Your Leagues
          </p>
          {leagues.map((league) => (
            <Button
              key={league.id}
              onClick={() => navigate(`/league/${league.id}`)}
              className="w-full"
            >
              <div className="font-bold text-foreground font-mono">
                {league.name}
              </div>
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-neutral-500 text-sm">
          You&apos;re not in any leagues yet.
        </p>
      )}

      {!availableLoading &&
        availableLeagues &&
        availableLeagues.length > 0 && (
          <div className="w-full max-w-sm space-y-3">
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono text-center">
              Join a League
            </p>
            <div className="space-y-2">
              <select
                value={selectedLeagueId}
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {availableLeagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
              <Button
                className="w-full"
                disabled={!selectedLeagueId || signUp.isPending}
                onClick={() =>
                  selectedLeagueId && signUp.mutate({ leagueId: selectedLeagueId })
                }
              >
                {signUp.isPending ? "Signing up…" : "Sign up"}
              </Button>
            </div>
          </div>
        )}

      {canCreateLeague &&
        (!showCreate ? (
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Create a League or Tournament
          </Button>
        ) : (
          <div className="w-full max-w-sm space-y-4 bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-bold text-sm uppercase tracking-widest font-mono">
              New League
            </h2>
            <div className="space-y-1.5">
              <Label>League Name</Label>
              <Input
                placeholder="e.g. Lincoln TLV"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const slug = name
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");
                  createLeague.mutate({ name, slug });
                }}
                disabled={!name.trim() || createLeague.isPending}
                className="flex-1"
              >
                {createLeague.isPending ? "Creating…" : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
};
