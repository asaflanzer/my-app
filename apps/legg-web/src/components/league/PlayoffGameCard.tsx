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

interface IPlayoffGameCardProps {
  game: IPlayoffGame;
  myMemberId?: string | undefined;
  raceTo: number;
  gameType: string;
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

export const PlayoffGameCard = ({
  game,
  myMemberId,
  raceTo,
  gameType,
}: IPlayoffGameCardProps) => {
  const [open, setOpen] = useState(false);

  const isMePlayer1 = myMemberId && game.player1?.memberId === myMemberId;
  const isMePlayer2 = myMemberId && game.player2?.memberId === myMemberId;

  const p1IsWinner =
    game.isComplete && game.winnerId === game.player1?.memberId;
  const p2IsWinner =
    game.isComplete && game.winnerId === game.player2?.memberId;

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
        <DrawerContent className="max-h-[55vh]">
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

          <div className="px-4 pb-6 space-y-3">
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
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
