import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";

export const MeetingDetailPage = () => {
  const { leagueId, meetingId } = useParams<{
    leagueId: string;
    meetingId: string;
  }>();
  const navigate = useNavigate();
  const { league, isAdmin } = useLeagueContext();

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editState, setEditState] = useState({
    player1Id: "",
    player2Id: "",
    score1: 0,
    score2: 0,
  });

  const utils = trpc.useUtils();

  const { data: matches, isLoading } =
    trpc.meeting.getMatchesByMeeting.useQuery(
      { leagueId: leagueId ?? "", meetingId: meetingId ?? "" },
      { enabled: !!leagueId && !!meetingId },
    );

  const updateMatch = trpc.meeting.updateMatchRecord.useMutation({
    onSuccess: () => {
      void utils.meeting.getMatchesByMeeting.invalidate({
        leagueId: leagueId ?? "",
        meetingId: meetingId ?? "",
      });
      setEditingMatchId(null);
      toast("Match updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const meetingNumber = matches?.[0]?.meetingNumber;
  const activeMembers = league?.members.filter((m) => !m.disabled) ?? [];

  const startEdit = (match: {
    id: string;
    player1Id: string | null;
    player2Id: string | null;
    score1: number;
    score2: number;
  }) => {
    setEditingMatchId(match.id);
    setEditState({
      player1Id: match.player1Id ?? "",
      player2Id: match.player2Id ?? "",
      score1: match.score1,
      score2: match.score2,
    });
  };

  const handleSave = () => {
    if (!editingMatchId || !leagueId) return;
    updateMatch.mutate({
      leagueId,
      matchId: editingMatchId,
      player1Id: editState.player1Id || null,
      player2Id: editState.player2Id || null,
      score1: editState.score1,
      score2: editState.score2,
    });
  };

  return (
    <>
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate("/leagues")}>Leagues</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate(`/league/${leagueId}`)}>
                  {league?.name ?? "League"}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {isAdmin && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      onClick={() => navigate(`/league/${leagueId}/admin`)}
                    >
                      Admin
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>
                {meetingNumber != null
                  ? `Meeting #${meetingNumber}`
                  : "Meeting"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground uppercase tracking-widest">
          {meetingNumber != null ? `Meeting #${meetingNumber}` : "Meeting"}
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : !matches || matches.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12 border border-border rounded-xl">
            No completed matches for this meeting yet.
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => {
              const isEditing = editingMatchId === match.id;
              const winnerIsP1 = match.winnerId === match.player1Id;
              const winnerIsP2 = match.winnerId === match.player2Id;

              return (
                <div
                  key={match.id}
                  className="bg-card border border-card-border rounded-xl px-4 py-3"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={editState.player1Id}
                          onValueChange={(v) =>
                            setEditState((s) => ({ ...s, player1Id: v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue placeholder="Player 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeMembers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.userName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Input
                            type="number"
                            min={0}
                            value={editState.score1}
                            onChange={(e) =>
                              setEditState((s) => ({
                                ...s,
                                score1: Math.max(0, Number(e.target.value)),
                              }))
                            }
                            className="h-8 w-12 text-center text-sm px-1"
                          />
                          <span className="text-muted-foreground text-xs">
                            –
                          </span>
                          <Input
                            type="number"
                            min={0}
                            value={editState.score2}
                            onChange={(e) =>
                              setEditState((s) => ({
                                ...s,
                                score2: Math.max(0, Number(e.target.value)),
                              }))
                            }
                            className="h-8 w-12 text-center text-sm px-1"
                          />
                        </div>

                        <Select
                          value={editState.player2Id}
                          onValueChange={(v) =>
                            setEditState((s) => ({ ...s, player2Id: v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue placeholder="Player 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeMembers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.userName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMatchId(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={updateMatch.isPending}
                          className="text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                        T{match.tableNumber}
                      </span>

                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span
                          className={cn(
                            "text-sm truncate max-w-[35%]",
                            winnerIsP1
                              ? "font-bold text-emerald-500"
                              : "text-foreground",
                          )}
                        >
                          {match.player1Name ?? "—"}
                        </span>

                        <div className="flex items-center gap-1 flex-shrink-0 mx-2">
                          <span
                            className={cn(
                              "text-sm font-bold w-5 text-center",
                              winnerIsP1
                                ? "text-emerald-500"
                                : "text-foreground",
                            )}
                          >
                            {match.score1}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            –
                          </span>
                          <span
                            className={cn(
                              "text-sm font-bold w-5 text-center",
                              winnerIsP2
                                ? "text-emerald-500"
                                : "text-foreground",
                            )}
                          >
                            {match.score2}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "text-sm truncate max-w-[35%] text-right",
                            winnerIsP2
                              ? "font-bold text-emerald-500"
                              : "text-foreground",
                          )}
                        >
                          {match.player2Name ?? "—"}
                        </span>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(match)}
                          aria-label="Edit match"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};
