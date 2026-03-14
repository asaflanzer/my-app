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
import { AppHeader } from "@/components/AppHeader";

export const ChooseLeaguePage = () => {
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
      navigate(`/leagues`);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const canCreateLeague = isAdmin(session.user.email);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1 flex-col items-center px-4 pt-8 gap-8">
        {leaguesLoading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        ) : leagues && leagues.length > 0 ? (
          <div className="w-full max-w-sm space-y-3 px-8">
            <p className="text-sm text-neutral-500 uppercase tracking-widest font-mono text-center">
              Your Leagues
            </p>
            {leagues.map((league) => (
              <Button
                key={league.id}
                size="sm"
                onClick={() => navigate(`/league/${league.id}`)}
                className="w-full"
              >
                <div className="text-foreground font-mono">{league.name}</div>
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
            <div className="w-full max-w-sm space-y-3 px-8">
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
                  size="sm"
                  className="w-full"
                  disabled={!selectedLeagueId || signUp.isPending}
                  onClick={() =>
                    selectedLeagueId &&
                    signUp.mutate({ leagueId: selectedLeagueId })
                  }
                >
                  {signUp.isPending ? "Signing up…" : "Sign up"}
                </Button>
              </div>
            </div>
          )}

        <div className="w-full max-w-sm space-y-3 px-8 mt-auto pb-8">
          {canCreateLeague &&
            (!showCreate ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="gap-2 w-full font-mono"
              >
                <Plus className="h-4 w-4" /> Host a League
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
      </div>
    </div>
  );
};
