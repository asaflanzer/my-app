import { cn } from "@/lib/utils";
import type { IPlayoffGame } from "@/lib/playoffs.utils";

interface IPlayoffGameCardProps {
  game: IPlayoffGame;
  myMemberId?: string | undefined;
  raceTo: number;
  gameType: string;
}

const bracketLabel: Record<IPlayoffGame["bracket"], string> = {
  winners: "W",
  losers: "L",
  final: "Final",
};

export const PlayoffGameCard = ({
  game,
  myMemberId,
  raceTo,
  gameType,
}: IPlayoffGameCardProps) => {
  const isMePlayer1 = myMemberId && game.player1?.memberId === myMemberId;
  const isMePlayer2 = myMemberId && game.player2?.memberId === myMemberId;

  const p1IsWinner =
    game.isComplete && game.winnerId === game.player1?.memberId;
  const p2IsWinner =
    game.isComplete && game.winnerId === game.player2?.memberId;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden",
        game.isComplete && "opacity-70",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Game {game.game}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {bracketLabel[game.bracket]} · Race to {raceTo} · {gameType}
        </span>
      </div>

      {/* Player rows */}
      <div className="divide-y divide-border">
        {/* Player 1 */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2.5",
            isMePlayer1 && "bg-primary/10",
            p1IsWinner && "bg-emerald-500/10",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {p1IsWinner && (
              <span className="text-emerald-500 text-xs font-bold shrink-0">
                ▶
              </span>
            )}
            <span
              className={cn(
                "text-sm truncate",
                !game.player1 && "text-muted-foreground italic",
                p1IsWinner && "font-semibold text-emerald-600",
                p2IsWinner && "text-muted-foreground line-through",
              )}
            >
              {game.player1?.name ?? game.player1PrevGame ?? "TBD"}
            </span>
            {isMePlayer1 && (
              <span className="text-[10px] text-primary font-bold shrink-0">
                YOU
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-sm font-mono font-semibold tabular-nums ml-2 shrink-0",
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
            "flex items-center justify-between px-3 py-2.5",
            isMePlayer2 && "bg-primary/10",
            p2IsWinner && "bg-emerald-500/10",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {p2IsWinner && (
              <span className="text-emerald-500 text-xs font-bold shrink-0">
                ▶
              </span>
            )}
            <span
              className={cn(
                "text-sm truncate",
                !game.player2 && "text-muted-foreground italic",
                p2IsWinner && "font-semibold text-emerald-600",
                p1IsWinner && "text-muted-foreground line-through",
              )}
            >
              {game.player2?.name ?? game.player2PrevGame ?? "TBD"}
            </span>
            {isMePlayer2 && (
              <span className="text-[10px] text-primary font-bold shrink-0">
                YOU
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-sm font-mono font-semibold tabular-nums ml-2 shrink-0",
              p2IsWinner && "text-emerald-600",
              !game.isComplete && "text-muted-foreground",
            )}
          >
            {game.player2Score ?? (game.player2 ? "—" : "")}
          </span>
        </div>
      </div>
    </div>
  );
};
