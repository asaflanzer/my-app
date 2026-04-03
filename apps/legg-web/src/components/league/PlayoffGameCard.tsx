import { useState } from "react";
import { cn } from "@/lib/utils";
import type { IPlayoffGame } from "@/lib/playoffs.utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";

type PlayerStatus = "available" | "ready" | "playing";

interface IPlayoffGameCardProps {
  game: IPlayoffGame;
  myMemberId?: string | undefined;
  raceTo: number;
  gameType: string;
  isAdmin: boolean;
  leagueId: string;
  gameIndex: number;
  player1Status?: PlayerStatus | undefined;
  player2Status?: PlayerStatus | undefined;
}

const bracketLabel: Record<IPlayoffGame["bracket"], string> = {
  winners: "Winners",
  losers: "Losers",
  final: "Final",
};

const bracketBadgeClass: Record<IPlayoffGame["bracket"], string> = {
  winners: "bg-blue-500/15 text-blue-600",
  losers: "bg-orange-500/15 text-orange-600",
  final: "bg-purple-500/15 text-purple-600",
};

function StatusBadge({ status }: { status: PlayerStatus | undefined }) {
  if (!status || status === "playing") return null;
  return (
    <span
      className={cn(
        "text-[9px] font-semibold px-1 py-0.5 rounded shrink-0 leading-tight",
        status === "ready"
          ? "bg-emerald-500/15 text-emerald-600"
          : "bg-orange-500/15 text-orange-600",
      )}
    >
      {status === "ready" ? "Ready" : "Break"}
    </span>
  );
}

export const PlayoffGameCard = ({
  game,
  myMemberId,
  raceTo,
  gameType,
  isAdmin,
  leagueId,
  gameIndex,
  player1Status,
  player2Status,
}: IPlayoffGameCardProps) => {
  const [open, setOpen] = useState(false);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);

  const utils = trpc.useUtils();
  const recordResult = trpc.playoffs.recordResult.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.playoffs.getBracket.invalidate({ leagueId });
    },
  });

  const isMePlayer1 = myMemberId && game.player1?.memberId === myMemberId;
  const isMePlayer2 = myMemberId && game.player2?.memberId === myMemberId;

  const p1IsWinner =
    game.isComplete && game.winnerId === game.player1?.memberId;
  const p2IsWinner =
    game.isComplete && game.winnerId === game.player2?.memberId;

  const canSubmit =
    isAdmin &&
    !game.isComplete &&
    !!game.player1 &&
    !!game.player2;

  const submitDisabled =
    recordResult.isPending ||
    (score1 < raceTo && score2 < raceTo) ||
    (score1 === score2);

  function handleSubmit() {
    if (!game.player1 || !game.player2) return;
    const winnerId =
      score1 >= raceTo ? game.player1.memberId : game.player2.memberId;
    const loserId =
      score1 >= raceTo ? game.player2.memberId : game.player1.memberId;
    recordResult.mutate({
      leagueId,
      gameIndex,
      winnerId,
      loserId,
      player1Score: score1,
      player2Score: score2,
    });
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden cursor-pointer hover:border-primary/40 transition-colors",
          game.isComplete && "opacity-70",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            G{game.game}
          </span>
          <span className="text-[9px] text-muted-foreground truncate ml-1">
            {bracketLabel[game.bracket]} · R{raceTo} · {gameType}
          </span>
        </div>

        {/* Player rows */}
        <div className="divide-y divide-border">
          {/* Player 1 */}
          <div
            className={cn(
              "flex items-center justify-between px-2 py-1.5",
              isMePlayer1 && "bg-primary/10",
              p1IsWinner && "bg-emerald-500/10",
            )}
          >
            <div className="flex items-center gap-1 min-w-0">
              {p1IsWinner && (
                <span className="text-[9px] font-bold text-white bg-emerald-500 rounded px-0.5 leading-tight shrink-0">
                  W
                </span>
              )}
              <span
                className={cn(
                  "text-[11px] truncate",
                  !game.player1 && "text-muted-foreground italic",
                  p1IsWinner && "font-semibold text-emerald-600",
                  p2IsWinner && "text-muted-foreground line-through",
                )}
              >
                {game.player1?.name ?? game.player1PrevGame ?? "TBD"}
              </span>
              {isMePlayer1 && (
                <span className="text-[9px] text-primary font-bold shrink-0">
                  YOU
                </span>
              )}
              <StatusBadge status={player1Status} />
            </div>
            <span
              className={cn(
                "text-[11px] font-mono font-semibold tabular-nums ml-1 shrink-0",
                p1IsWinner && "text-emerald-600",
                !game.isComplete && "text-muted-foreground",
              )}
            >
              {game.player1Score ?? (game.player1 ? "—" : "")}
            </span>
          </div>

          {/* Player 2 */}
          <div
            className={cn(
              "flex items-center justify-between px-2 py-1.5",
              isMePlayer2 && "bg-primary/10",
              p2IsWinner && "bg-emerald-500/10",
            )}
          >
            <div className="flex items-center gap-1 min-w-0">
              {p2IsWinner && (
                <span className="text-[9px] font-bold text-white bg-emerald-500 rounded px-0.5 leading-tight shrink-0">
                  W
                </span>
              )}
              <span
                className={cn(
                  "text-[11px] truncate",
                  !game.player2 && "text-muted-foreground italic",
                  p2IsWinner && "font-semibold text-emerald-600",
                  p1IsWinner && "text-muted-foreground line-through",
                )}
              >
                {game.player2?.name ?? game.player2PrevGame ?? "TBD"}
              </span>
              {isMePlayer2 && (
                <span className="text-[9px] text-primary font-bold shrink-0">
                  YOU
                </span>
              )}
              <StatusBadge status={player2Status} />
            </div>
            <span
              className={cn(
                "text-[11px] font-mono font-semibold tabular-nums ml-1 shrink-0",
                p2IsWinner && "text-emerald-600",
                !game.isComplete && "text-muted-foreground",
              )}
            >
              {game.player2Score ?? (game.player2 ? "—" : "")}
            </span>
          </div>
        </div>
      </div>

      {/* Game detail drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <DrawerTitle className="text-base">Game {game.game}</DrawerTitle>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  bracketBadgeClass[game.bracket],
                )}
              >
                {bracketLabel[game.bracket]}
              </span>
              <span className="text-xs text-muted-foreground">
                Race to {raceTo} · {gameType}
              </span>
            </div>
            <DrawerClose className="text-muted-foreground hover:text-foreground text-xs">
              ✕
            </DrawerClose>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4 overflow-y-auto">
            {/* Status chip */}
            <div className="flex justify-center">
              <span
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  game.isComplete
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {game.isComplete ? "Complete" : "Pending"}
              </span>
            </div>

            {/* Scoreboard */}
            <div className="flex items-stretch gap-3">
              {/* Player 1 */}
              <div
                className={cn(
                  "flex-1 rounded-xl border p-4 flex flex-col items-center gap-1",
                  p1IsWinner
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-muted/30",
                )}
              >
                {p1IsWinner && (
                  <span className="text-[10px] font-bold text-white bg-emerald-500 rounded px-1 py-0.5 leading-tight">
                    W
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-semibold text-center leading-tight",
                    p2IsWinner && "text-muted-foreground line-through",
                    !game.player1 && "text-muted-foreground italic",
                  )}
                >
                  {game.player1?.name ?? game.player1PrevGame ?? "TBD"}
                </span>
                <StatusBadge status={player1Status} />
                <span
                  className={cn(
                    "text-3xl font-bold font-mono tabular-nums",
                    p1IsWinner && "text-emerald-600",
                    !game.isComplete && "text-muted-foreground",
                  )}
                >
                  {game.player1Score ?? (game.player1 ? "—" : "–")}
                </span>
              </div>

              {/* VS divider */}
              <div className="flex items-center">
                <span className="text-xs font-bold text-muted-foreground">
                  VS
                </span>
              </div>

              {/* Player 2 */}
              <div
                className={cn(
                  "flex-1 rounded-xl border p-4 flex flex-col items-center gap-1",
                  p2IsWinner
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-muted/30",
                )}
              >
                {p2IsWinner && (
                  <span className="text-[10px] font-bold text-white bg-emerald-500 rounded px-1 py-0.5 leading-tight">
                    W
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-semibold text-center leading-tight",
                    p1IsWinner && "text-muted-foreground line-through",
                    !game.player2 && "text-muted-foreground italic",
                  )}
                >
                  {game.player2?.name ?? game.player2PrevGame ?? "TBD"}
                </span>
                <StatusBadge status={player2Status} />
                <span
                  className={cn(
                    "text-3xl font-bold font-mono tabular-nums",
                    p2IsWinner && "text-emerald-600",
                    !game.isComplete && "text-muted-foreground",
                  )}
                >
                  {game.player2Score ?? (game.player2 ? "—" : "–")}
                </span>
              </div>
            </div>

            {/* Score submission — admin only, pending games with both players */}
            {canSubmit && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground text-center uppercase tracking-wide">
                  Submit Score
                </p>

                <div className="flex items-center gap-3">
                  {/* Player 1 stepper */}
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground truncate max-w-full">
                      {game.player1?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScore1((s) => Math.max(0, s - 1))}
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="text-2xl font-bold font-mono tabular-nums w-8 text-center">
                        {score1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScore1((s) => Math.min(raceTo, s + 1))}
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-muted-foreground">
                    VS
                  </span>

                  {/* Player 2 stepper */}
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground truncate max-w-full">
                      {game.player2?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScore2((s) => Math.max(0, s - 1))}
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="text-2xl font-bold font-mono tabular-nums w-8 text-center">
                        {score2}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScore2((s) => Math.min(raceTo, s + 1))}
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {recordResult.isPending ? "Submitting…" : "Submit Score"}
                </button>

                {recordResult.isError && (
                  <p className="text-xs text-red-500 text-center">
                    Failed to submit. Please try again.
                  </p>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
