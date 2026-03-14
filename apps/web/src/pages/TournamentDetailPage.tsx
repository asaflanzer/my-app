import { useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  swiss: "Swiss",
  free_for_all: "Free for All",
  leaderboard: "Leaderboard",
};

const DURATION_LABELS: Record<string, string> = {
  single_day: "Single Day",
  multi_day: "Multi-Day",
  recurring: "Recurring",
};

function statusLabel(status: string) {
  if (status === "published" || status === "in_progress") return "Live";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Done";
  return "Draft";
}

function statusClass(status: string) {
  if (status === "published" || status === "in_progress") return "bg-green-100 text-green-700";
  if (status === "paused") return "bg-yellow-100 text-yellow-700";
  if (status === "completed") return "bg-gray-100 text-gray-700";
  return "bg-muted text-muted-foreground";
}

export const TournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.tournament.getById.useQuery(
    { id: id! },
    { enabled: !!id && !!session }
  );

  const invalidate = () => utils.tournament.getById.invalidate({ id: id! });

  const publishMutation = trpc.tournament.publish.useMutation({
    onSuccess: invalidate,
    onError: (e) => setActionError(e.message),
  });
  const startMutation = trpc.tournament.start.useMutation({
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e) => setActionError(e.message),
  });
  const pauseMutation = trpc.tournament.pause.useMutation({
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e) => setActionError(e.message),
  });
  const deleteMutation = trpc.tournament.delete.useMutation({
    onSuccess: () => navigate("/tournaments"),
    onError: (e) => setActionError(e.message),
  });
  const unregisterMutation = trpc.tournament.unregister.useMutation({
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e) => setActionError(e.message),
  });

  if (sessionPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8">
        <p className="text-destructive text-center">
          {error.message === "FORBIDDEN" ? "This tournament is private." : "Tournament not found."}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
      </div>
    );
  }

  if (!data) return null;

  const { tournament, participants, matches } = data;
  const isHost = session.user.id === tournament.hostId;
  const isRegistered = participants.some((p) => p.userId === session.user.id);
  const realCount = participants.filter((p) => !p.isPlaceholder).length;
  const maxCount = tournament.maxParticipants;
  const missingCount = participants.filter((p) => p.isPlaceholder).length;
  const status = tournament.status;
  const canRegister =
    !isHost &&
    tournament.registrationType === "sign_up_page" &&
    (status === "published" || status === "in_progress") &&
    (!maxCount || realCount < maxCount);

  const isPending =
    publishMutation.isPending || startMutation.isPending ||
    pauseMutation.isPending || deleteMutation.isPending;

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const matchesByRound = (round: number, losers: boolean) =>
    matches
      .filter((m) => m.round === round && m.isLosersBracket === losers)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  const participantName = (pid: string | null) =>
    pid ? (participants.find((p) => p.id === pid)?.name ?? "TBD") : "TBD";
  const hasLosers = matches.some((m) => m.isLosersBracket);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={() => navigate("/")} className="text-lg font-bold hover:opacity-80">
          Game On
        </button>
      </header>

      {/* Host action bar */}
      {isHost && (
        <div className="border-b bg-muted/40 px-4 py-2 flex items-center gap-2 flex-wrap">
          {status === "draft" && (
            <Button
              size="sm"
              onClick={() => { setActionError(null); publishMutation.mutate({ id: id! }); }}
              disabled={isPending}
            >
              Publish
            </Button>
          )}
          {(status === "published" || status === "paused") && (
            <Button size="sm" onClick={() => startMutation.mutate({ id: id! })} disabled={isPending}>
              {status === "paused" ? "Resume" : "Start"}
            </Button>
          )}
          {status === "in_progress" && (
            <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate({ id: id! })} disabled={isPending}>
              Pause
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate(`/tournament/${id}/edit`)} disabled={isPending}>
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isPending}>Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete tournament?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{tournament.name}</strong> and all its data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate({ id: id! })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {actionError && <span className="text-xs text-destructive">{actionError}</span>}
        </div>
      )}

      {/* Missing participants banner */}
      {isHost && missingCount > 0 && status === "draft" && (
        <div className="px-4 pt-3">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>{missingCount} participant{missingCount === 1 ? "" : "s"} still missing.</strong>{" "}
              Replace all placeholder slots before publishing.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="mx-auto w-full max-w-lg space-y-4 p-4">
        {/* Tournament Card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Name + status */}
          <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">{tournament.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tournament.gameType}
                {tournament.isTentative && (
                  <span className="ml-2 text-xs text-yellow-600">· Tentative</span>
                )}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(status)}`}>
              {statusLabel(status)}
            </span>
          </div>

          {/* Format + participant count */}
          <div className="px-4 py-3 border-t border-b flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{FORMAT_LABELS[tournament.format] ?? tournament.format}</p>
              <p className="text-xs text-muted-foreground">{DURATION_LABELS[tournament.duration] ?? tournament.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {realCount}
                {maxCount ? (
                  <span className="text-muted-foreground text-base font-normal">/{maxCount}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">participants</p>
            </div>
          </div>

          {/* Date + free/paid + register button */}
          <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Starts</p>
              <p className="text-sm font-medium">
                {new Date(tournament.startDate).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {tournament.isFree ? "Free" : "Paid"}
              </span>
              {(canRegister || (isRegistered && !isHost)) && (
                <Button
                  size="sm"
                  variant={isRegistered ? "outline" : "default"}
                  onClick={() => {
                    if (isRegistered) {
                      unregisterMutation.mutate({ id: id! });
                    } else {
                      setRegisterOpen(true);
                    }
                  }}
                  disabled={unregisterMutation.isPending}
                >
                  {isRegistered ? "Cancel Registration" : "Register"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bracket */}
        {matches.length > 0 && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Bracket</h2>
            </div>
            <div className="p-4 space-y-4">
              {rounds
                .filter((r) => matchesByRound(r, false).length > 0)
                .map((round) => (
                  <div key={`w-${round}`}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {hasLosers ? "Winners · " : ""}Round {round}
                    </p>
                    <div className="space-y-1.5">
                      {matchesByRound(round, false).map((m) => (
                        <div key={m.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <span className="flex-1 font-medium truncate">{participantName(m.participant1Id)}</span>
                          <span className="text-muted-foreground text-xs shrink-0">vs</span>
                          <span className="flex-1 font-medium truncate text-right">{participantName(m.participant2Id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {hasLosers &&
                rounds
                  .filter((r) => matchesByRound(r, true).length > 0)
                  .map((round) => (
                    <div key={`l-${round}`}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Losers · Round {round}
                      </p>
                      <div className="space-y-1.5">
                        {matchesByRound(round, true).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm opacity-70">
                            <span className="flex-1 truncate">{participantName(m.participant1Id)}</span>
                            <span className="text-muted-foreground text-xs shrink-0">vs</span>
                            <span className="flex-1 truncate text-right">{participantName(m.participant2Id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </main>

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        tournamentId={id!}
        isFree={tournament.isFree}
        defaultName={session.user.name ?? ""}
        participants={participants}
        onSuccess={() => { setRegisterOpen(false); invalidate(); }}
      />
    </div>
  );
};

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  isFree: boolean;
  defaultName: string;
  participants: Array<{
    id: string;
    name: string;
    teamName: string | null;
    isPlaceholder: boolean;
    seed: number | null;
  }>;
  onSuccess: () => void;
}

const RegisterModal = ({
  open,
  onClose,
  tournamentId,
  isFree,
  defaultName,
  participants,
  onSuccess,
}: RegisterModalProps) => {
  const [name, setName] = useState(defaultName);
  const [paymentMethod, setPaymentMethod] = useState<"google_pay" | "apple_pay" | "cash">("cash");
  const [error, setError] = useState<string | null>(null);

  const registerMutation = trpc.tournament.register.useMutation({
    onSuccess,
    onError: (e) => setError(e.message),
  });

  const handleConfirm = () => {
    setError(null);
    registerMutation.mutate({ id: tournamentId, name, paymentMethod });
  };

  const realParticipants = participants
    .filter((p) => !p.isPlaceholder)
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Register</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Your name</Label>
            <Input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label>Payment method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="google_pay" id="pay-gp" />
                  <Label htmlFor="pay-gp" className="font-normal cursor-pointer">Google Pay</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="apple_pay" id="pay-ap" />
                  <Label htmlFor="pay-ap" className="font-normal cursor-pointer">Apple Pay</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="pay-cash" />
                  <Label htmlFor="pay-cash" className="font-normal cursor-pointer">Cash</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {realParticipants.length > 0 && (
            <div className="space-y-1.5">
              <Label>Participants ({realParticipants.length})</Label>
              <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                {realParticipants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
                    <span className="truncate">{p.name}</span>
                    {p.teamName && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{p.teamName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={registerMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || registerMutation.isPending}>
            {registerMutation.isPending ? "Confirming…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
