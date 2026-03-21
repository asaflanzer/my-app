import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlayoffGameCard } from "@/components/league/PlayoffGameCard";
import type { IPlayoffBracket, IPlayoffGame } from "@/lib/playoffs.utils";
import { groupGamesByRound } from "@/lib/playoffs.utils";

interface IPlayoffBracketProps {
  bracket: IPlayoffBracket;
  myMemberId: string | undefined;
  raceTo: number;
  gameType: string;
}

// Layout constants — must match the compact card's rendered height.
const CARD_H = 90;
const CARD_GAP = 8; // gap-2
const SLOT_H = CARD_H + CARD_GAP;
const CARD_W = 132;
const CONN_W = 20;

/** Label for a round based on how far it is from the last round. */
function getRoundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  switch (fromEnd) {
    case 0:
      return "Finals";
    case 1:
      return "Semi-Finals";
    case 2:
      return "Quarter-Finals";
    default:
      return `Round ${roundIndex + 1}`;
  }
}

// Draws SVG connector lines between two adjacent round columns.
// srcOffset / tgtOffset are pixel top-padding applied to each column for centering.
function RoundConnectors({
  sourceGames,
  targetGames,
  srcOffset,
  tgtOffset,
  svgH,
}: {
  sourceGames: IPlayoffGame[];
  targetGames: IPlayoffGame[];
  srcOffset: number;
  tgtOffset: number;
  svgH: number;
}) {
  // Group source games by their winner destination (0-based bracket.games index).
  const winnerGroups = new Map<number, number[]>();
  sourceGames.forEach((sg, si) => {
    if (typeof sg.winnerNextGame !== "number") return;
    const list = winnerGroups.get(sg.winnerNextGame) ?? [];
    list.push(si);
    winnerGroups.set(sg.winnerNextGame, list);
  });

  // Loser drop-down connections.
  const loserLines: { srcY: number; tgtY: number }[] = [];
  sourceGames.forEach((sg, si) => {
    if (typeof sg.loserNextGame !== "number") return;
    const tgtIdx = targetGames.findIndex(
      (g) => g.game - 1 === sg.loserNextGame,
    );
    if (tgtIdx < 0) return;
    loserLines.push({
      srcY: srcOffset + si * SLOT_H + CARD_H / 2,
      tgtY: tgtOffset + tgtIdx * SLOT_H + CARD_H / 2,
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
        const tgtY = tgtOffset + tgtIdx * SLOT_H + CARD_H / 2;
        const srcYs = srcPositions.map(
          (si) => srcOffset + si * SLOT_H + CARD_H / 2,
        );

        if (srcYs.length === 1) {
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

  // Max games in any round — used to compute vertical centering offsets.
  const maxGames = useMemo(
    () => Math.max(...rounds.map((r) => r.length)),
    [rounds],
  );
  const maxColH = maxGames * SLOT_H - CARD_GAP;

  /** Pixel top-offset to vertically center a round with N games. */
  const getOffset = (n: number) => ((maxGames - n) * SLOT_H) / 2;

  return (
    <div className="py-4 space-y-4">
      <h2 className="px-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Playoff Bracket
      </h2>

      {/* Bracket — horizontal scroll */}
      <div className="relative">
        {/* Scroll arrows */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="overflow-x-auto mx-8"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Round labels row */}
          <div className="flex mb-2 pl-2">
            {rounds.map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between shrink-0"
                style={{ width: CARD_W, marginRight: CONN_W }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {getRoundLabel(i, bracket.totalRounds)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {i + 1}/{bracket.totalRounds}
                </span>
              </div>
            ))}
            {/* Podium label */}
            <div className="flex items-center shrink-0" style={{ width: CARD_W }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Podium
              </span>
            </div>
          </div>

          {/* Game cards + connector SVGs — all in one row */}
          <div
            className="flex items-start pl-2 pb-4"
            style={{ height: maxColH }}
          >
            {rounds.map((roundGames, i) => {
              const nextRound = rounds[i + 1];
              const offset = getOffset(roundGames.length);
              const nextOffset = nextRound ? getOffset(nextRound.length) : 0;

              return (
                <div key={i} className="flex items-start shrink-0">
                  {/* Round column — vertically centered via paddingTop */}
                  <div
                    className="flex flex-col gap-2 shrink-0"
                    style={{ width: CARD_W, paddingTop: offset }}
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

                  {/* Connector SVG */}
                  {nextRound && (
                    <RoundConnectors
                      sourceGames={roundGames}
                      targetGames={nextRound}
                      srcOffset={offset}
                      tgtOffset={nextOffset}
                      svgH={maxColH}
                    />
                  )}
                </div>
              );
            })}

            {/* Podium column */}
            <div className="flex items-start shrink-0">
              <div style={{ width: CONN_W, flexShrink: 0 }} />
              <div
                className="flex flex-col gap-2 shrink-0"
                style={{ width: CARD_W, paddingTop: getOffset(3) }}
              >
                {(
                  [
                    { emoji: "🥇", label: "1st Place", player: bracket.champion },
                    { emoji: "🥈", label: "2nd Place", player: bracket.runnerUp },
                    { emoji: "🥉", label: "3rd Place", player: bracket.thirdPlace },
                  ] as const
                ).map(({ emoji, label, player }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-card text-card-foreground shadow-sm flex flex-col items-center justify-center gap-0.5 px-2"
                    style={{ minHeight: CARD_H }}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                    <span className="text-[11px] font-semibold text-center leading-tight w-full truncate">
                      {player?.name ?? "TBD"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
