import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { PlayoffGameCard } from "@/components/league/PlayoffGameCard";
import type { IPlayoffBracket, IPlayoffGame } from "@/lib/playoffs.utils";
import { groupGamesByRound } from "@/lib/playoffs.utils";

interface IPlayoffBracketProps {
  bracket: IPlayoffBracket;
  myMemberId: string | undefined;
  raceTo: number;
  gameType: string;
}

const roundLabels = [
  "Round 1",
  "Round 2",
  "Quarter-Finals",
  "Semi-Finals",
  "Finals",
];

// Layout constants — must match the compact card's rendered height.
// Header: py-1 (~8px) + text (~16px) = ~24px
// Two player rows: py-1.5 (~12px) + text (~20px) = ~32px each
// Borders: ~2px  → total ≈ 90px
const CARD_H = 90;
const CARD_GAP = 8; // gap-2
const SLOT_H = CARD_H + CARD_GAP;
const CARD_W = 132;
const CONN_W = 20;

// Draws SVG connector lines between two adjacent round columns.
function RoundConnectors({
  sourceGames,
  targetGames,
}: {
  sourceGames: IPlayoffGame[];
  targetGames: IPlayoffGame[];
}) {
  const svgH = sourceGames.length * SLOT_H - CARD_GAP;

  // Group source games by their winner destination (0-based bracket.games index).
  const winnerGroups = new Map<number, number[]>(); // tgtGameIdx → [srcPositions]
  sourceGames.forEach((sg, si) => {
    if (typeof sg.winnerNextGame !== "number") return;
    const list = winnerGroups.get(sg.winnerNextGame) ?? [];
    list.push(si);
    winnerGroups.set(sg.winnerNextGame, list);
  });

  // Group loser connections separately.
  const loserLines: { srcY: number; tgtY: number }[] = [];
  sourceGames.forEach((sg, si) => {
    if (typeof sg.loserNextGame !== "number") return;
    const tgtIdx = targetGames.findIndex(
      (g) => g.game - 1 === sg.loserNextGame,
    );
    if (tgtIdx < 0) return;
    loserLines.push({
      srcY: si * SLOT_H + CARD_H / 2,
      tgtY: tgtIdx * SLOT_H + CARD_H / 2,
    });
  });

  const midX = CONN_W / 2;
  const borderColor = "hsl(var(--border))";
  const loserColor = "hsl(var(--muted-foreground))";

  return (
    <svg
      width={CONN_W}
      height={svgH}
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      {/* Winner bracket connectors */}
      {Array.from(winnerGroups.entries()).map(([tgtGameIdx, srcPositions]) => {
        const tgtIdx = targetGames.findIndex((g) => g.game - 1 === tgtGameIdx);
        if (tgtIdx < 0) return null;
        const tgtY = tgtIdx * SLOT_H + CARD_H / 2;
        const srcYs = srcPositions.map((si) => si * SLOT_H + CARD_H / 2);

        if (srcYs.length === 1) {
          // Single source → L-shaped path
          const srcY = srcYs[0]!;
          return (
            <path
              key={`w-${tgtGameIdx}`}
              d={`M 0 ${srcY} H ${midX} V ${tgtY} H ${CONN_W}`}
              stroke={borderColor}
              strokeWidth={1}
              fill="none"
            />
          );
        }

        // Multiple sources → bracket shape
        const minY = Math.min(...srcYs);
        const maxY = Math.max(...srcYs);
        return (
          <g
            key={`w-${tgtGameIdx}`}
            stroke={borderColor}
            strokeWidth={1}
            fill="none"
          >
            {srcYs.map((y) => (
              <line key={y} x1={0} y1={y} x2={midX} y2={y} />
            ))}
            <line x1={midX} y1={minY} x2={midX} y2={maxY} />
            <line x1={midX} y1={tgtY} x2={CONN_W} y2={tgtY} />
          </g>
        );
      })}

      {/* Loser drop-down connectors — dashed, muted */}
      {loserLines.map(({ srcY, tgtY }, i) => (
        <path
          key={`l-${i}`}
          d={`M 0 ${srcY} H ${midX} V ${tgtY} H ${CONN_W}`}
          stroke={loserColor}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.35}
          fill="none"
        />
      ))}
    </svg>
  );
}

export const PlayoffBracket = ({
  bracket,
  myMemberId,
  raceTo,
  gameType,
}: IPlayoffBracketProps) => {
  const rounds = useMemo(
    () => groupGamesByRound(bracket.games),
    [bracket.games],
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -(CARD_W + CONN_W + 16) : CARD_W + CONN_W + 16,
      behavior: "smooth",
    });
  };

  const hasEnded =
    bracket.champion !== null ||
    bracket.runnerUp !== null ||
    bracket.thirdPlace !== null;

  return (
    <div className="py-4 space-y-4">
      <h2 className="px-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Playoff Bracket
      </h2>

      {/* Podium */}
      {hasEnded && (
        <div className="mx-4 rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold">Final Standings</span>
          </div>
          {bracket.champion && (
            <div className="flex items-center gap-2">
              <span className="text-lg">🥇</span>
              <span className="text-sm font-semibold">
                {bracket.champion.name}
              </span>
            </div>
          )}
          {bracket.runnerUp && (
            <div className="flex items-center gap-2">
              <span className="text-lg">🥈</span>
              <span className="text-sm">{bracket.runnerUp.name}</span>
            </div>
          )}
          {bracket.thirdPlace && (
            <div className="flex items-center gap-2">
              <span className="text-lg">🥉</span>
              <span className="text-sm">{bracket.thirdPlace.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Bracket — horizontal scroll */}
      <div className="relative">
        {/* Left scroll arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Right scroll arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scrollable area — inset by arrow width so arrows don't overlap content */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-none mx-8"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Round labels row */}
          <div className="flex mb-2 pl-2">
            {rounds.map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between shrink-0"
                style={{
                  width: CARD_W,
                  marginRight: i < rounds.length - 1 ? CONN_W : 0,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {roundLabels[i] ?? `R${i + 1}`}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {i + 1}/{bracket.totalRounds}
                </span>
              </div>
            ))}
          </div>

          {/* Game cards + connectors row */}
          <div className="flex items-start pl-2 pb-4">
            {rounds.map((roundGames, i) => {
              const nextRound = rounds[i + 1];
              return (
                <div key={i} className="flex items-start shrink-0">
                  {/* Round column */}
                  <div
                    className="flex flex-col gap-2 shrink-0"
                    style={{ width: CARD_W }}
                  >
                    {roundGames.map((game) => (
                      <div key={game.game} style={{ minHeight: CARD_H }}>
                        <PlayoffGameCard
                          game={game}
                          myMemberId={myMemberId}
                          raceTo={raceTo}
                          gameType={gameType}
                        />
                      </div>
                    ))}
                  </div>

                  {/* SVG connector to next round */}
                  {nextRound && (
                    <RoundConnectors
                      sourceGames={roundGames}
                      targetGames={nextRound}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
