import { useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Logs, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/standings.utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useStandings } from "@/hooks/useStandings";
import { usePlayerHistory } from "@/hooks/usePlayerHistory";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const LeagueStandings = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { players, myMemberId } = useLeagueContext();

  const [standingsOpen, setStandingsOpen] = useState(() => {
    const v = sessionStorage.getItem("standings-open");
    return v === null ? true : v === "true";
  });
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);

  const {
    sorted,
    visibleRows,
    needsTruncation,
    standingsExpanded,
    setStandingsExpanded,
  } = useStandings(players, myMemberId);

  const { historyLoading, historyByMeeting } = usePlayerHistory(
    leagueId,
    historyMemberId,
  );

  const historyPlayer = historyMemberId
    ? players.find((p) => p.id === historyMemberId)
    : null;

  return (
    <>
      <Collapsible
        open={standingsOpen}
        onOpenChange={(open) => {
          setStandingsOpen(open);
          sessionStorage.setItem("standings-open", String(open));
        }}
        className="mb-6 px-[13px]"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer px-0 py-3">
          <h2 className="text-[11px] font-bold text-primary tracking-[1.5px] uppercase m-0 flex items-center">
            <Logs className="w-4 h-4 mr-2" /> Standings
          </h2>
          <ChevronDown
            size={14}
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              !standingsOpen && "-rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[22px_1fr_28px_28px_28px_36px] px-3 py-[7px] border-b border-muted text-[10px] text-table-header uppercase tracking-[.8px]">
              <span>#</span>
              <span>Player</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">GAMES</span>
              <span className="text-right">Pts</span>
            </div>
            {visibleRows.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                No players yet.
              </div>
            )}
            {visibleRows.map((row) => {
              if (row.kind === "hidden") {
                return (
                  <div
                    key="hidden"
                    onClick={() => setStandingsExpanded(true)}
                    className="bg-neutral-800 px-3 py-2 border-b border-muted cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  >
                    <div className="px-2 flex gap-2 items-center justify-center text-[10px] italic tracking-widest">
                      <Separator variant="secondary" type="dashed" />
                      <span className="text-primary whitespace-nowrap">
                        {row.count} hidden players
                      </span>
                      <Separator variant="secondary" type="dashed" />
                    </div>
                  </div>
                );
              }
              const { player: p, rank } = row;
              const rankCol =
                (
                  [
                    "text-yellow-400",
                    "text-rank-silver",
                    "text-amber-600",
                  ] as string[]
                )[rank - 1] ?? "";
              const isMe = p.id === myMemberId;
              const badge =
                (
                  { playing: "", ready: " ✋", available: "" } as Record<
                    string,
                    string
                  >
                )[p.status] ?? "";
              return (
                <div
                  key={p.id}
                  className={cn(
                    "grid grid-cols-[22px_1fr_28px_28px_28px_36px] px-3 py-[9px] items-center",
                    "border-b border-muted last:border-b-0",
                    isMe && "bg-me-row",
                  )}
                >
                  <span className={cn("text-[11px] font-extrabold", rankCol)}>
                    {rank}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] flex items-center gap-1",
                      isMe
                        ? "font-bold text-table-header"
                        : "font-normal text-foreground",
                      p.disabled && "line-through opacity-40",
                    )}
                  >
                    {p.name}
                    {badge}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement).blur();
                        setHistoryMemberId(p.id);
                      }}
                      className="-m-2 p-2 text-muted-foreground hover:text-primary active:text-primary/70 transition-colors flex-shrink-0"
                      aria-label={`View ${p.name} history`}
                    >
                      <Logs className="ml-1 w-3 h-3 text-foreground" />
                    </button>
                  </span>
                  <span className="text-center text-emerald-500 text-[13px] font-semibold">
                    {p.wins}
                  </span>
                  <span className="text-center text-red-400 text-[13px] font-semibold">
                    {p.losses}
                  </span>
                  <span className="text-center text-foreground text-[13px] font-semibold">
                    {p.games}
                  </span>
                  <span className="text-right text-secondary text-sm font-extrabold">
                    {formatScore(p.score)}
                  </span>
                </div>
              );
            })}
          </div>
          {needsTruncation && (
            <Button
              onClick={() => setStandingsExpanded((v) => !v)}
              variant="link"
              size="xs"
              className="w-full"
            >
              {standingsExpanded ? "View Less" : `View All (${sorted.length})`}
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* PLAYER HISTORY DRAWER */}
      <Drawer
        open={!!historyMemberId}
        onOpenChange={(open) => {
          if (!open) setHistoryMemberId(null);
        }}
      >
        <DrawerContent className="h-[100dvh] flex flex-col rounded-none">
          <DrawerHeader>
            <div className="flex flex-col gap-1 items-start border-b border-border pb-4">
              <div className="w-full flex items-center justify-between">
                <DrawerTitle className="text-base font-bold text-foreground">
                  {historyPlayer?.name ?? "Player"}
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <X className="w-4 h-4" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerDescription className="text-xs text-muted-foreground">
                Viewing player's match history
              </DrawerDescription>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>
            ) : historyByMeeting.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-12">
                No games played yet.
              </div>
            ) : (
              <div className="space-y-6">
                {historyByMeeting.map(([meetingNumber, matches]) => (
                  <div key={meetingNumber}>
                    <h3 className="text-[11px] font-bold text-primary tracking-[1.5px] uppercase mb-2">
                      Meeting #{meetingNumber}
                    </h3>
                    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                      {matches.map((match, idx) => (
                        <div
                          key={match.id}
                          className={cn(
                            "flex items-center justify-between px-4 py-3",
                            idx !== matches.length - 1 &&
                              "border-b border-muted",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                match.won
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-red-500/15 text-red-400",
                              )}
                            >
                              {match.won ? "W" : "L"}
                            </span>
                            <span className="text-sm text-foreground truncate">
                              vs {match.opponentName ?? "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                match.won
                                  ? "text-emerald-500"
                                  : "text-foreground",
                              )}
                            >
                              {match.myScore}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              –
                            </span>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                !match.won ? "text-red-400" : "text-foreground",
                              )}
                            >
                              {match.opponentScore}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              T{match.tableNumber}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
