import { useMemo } from "react";
import { Trophy } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PlayoffGameCard } from "@/components/league/PlayoffGameCard";
import type { IPlayoffBracket } from "@/lib/playoffs.utils";
import { groupGamesByRound, getMyActiveRound } from "@/lib/playoffs.utils";

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
  const startIndex = useMemo(
    () => getMyActiveRound(bracket, myMemberId),
    [bracket, myMemberId],
  );

  const hasEnded =
    bracket.champion !== null ||
    bracket.runnerUp !== null ||
    bracket.thirdPlace !== null;

  return (
    <div className="px-0 py-4 space-y-4">
      <h2 className="px-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Playoffs
      </h2>

      {/* Podium — shown once finals are played */}
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

      {/* Bracket Carousel — one column per slide */}
      <Carousel opts={{ startIndex, align: "start" }} className="w-full">
        <CarouselContent>
          {rounds.map((roundGames, i) => {
            const winners = roundGames.filter((g) => g.bracket === "winners");
            const losers = roundGames.filter((g) => g.bracket === "losers");
            const finals = roundGames.filter((g) => g.bracket === "final");
            const label = roundLabels[i] ?? `Round ${i + 1}`;

            return (
              <CarouselItem key={i} className="pl-4">
                <div className="space-y-3 pb-2">
                  {/* Round header */}
                  <div className="flex items-center justify-between pr-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                      {label}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">
                      {i + 1} / {bracket.totalRounds}
                    </span>
                  </div>

                  {/* Winners bracket games */}
                  {winners.length > 0 && (
                    <div className="space-y-2">
                      {winners.length > 1 && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">
                          Winners
                        </p>
                      )}
                      {winners.map((game) => (
                        <PlayoffGameCard
                          key={game.game}
                          game={game}
                          myMemberId={myMemberId}
                          raceTo={raceTo}
                          gameType={gameType}
                        />
                      ))}
                    </div>
                  )}

                  {/* Losers bracket games */}
                  {losers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">
                        Losers
                      </p>
                      {losers.map((game) => (
                        <PlayoffGameCard
                          key={game.game}
                          game={game}
                          myMemberId={myMemberId}
                          raceTo={raceTo}
                          gameType={gameType}
                        />
                      ))}
                    </div>
                  )}

                  {/* Grand final */}
                  {finals.map((game) => (
                    <PlayoffGameCard
                      key={game.game}
                      game={game}
                      myMemberId={myMemberId}
                      raceTo={raceTo}
                      gameType={gameType}
                    />
                  ))}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Navigation arrows */}
        <div className="flex justify-center gap-4 mt-4">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};
