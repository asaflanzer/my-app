import { useState } from "react";
import { ChevronDown, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const LeagueTables = () => {
  const { activeMeeting, players, myMemberId } = useLeagueContext();

  const [tablesOpen, setTablesOpen] = useState(() => {
    const v = sessionStorage.getItem("tables-open");
    return v === null ? true : v === "true";
  });

  if (!activeMeeting) return null;

  const allTables = activeMeeting.tables;
  const tables = allTables.filter((t) => t.status !== "done");
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  return (
    <Collapsible
      open={tablesOpen}
      onOpenChange={(open) => {
        setTablesOpen(open);
        sessionStorage.setItem("tables-open", String(open));
      }}
      className="my-4 px-[13px]"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer px-0 py-3">
        <h2 className="text-[11px] font-bold text-primary tracking-[1.5px] uppercase m-0 flex items-center">
          <Tablet className="w-4 h-4 mr-2" /> Tables
        </h2>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            !tablesOpen && "-rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {tables.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No active tables right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tables.map((t) => {
              const p1 = t.player1Id ? getPlayer(t.player1Id) : null;
              const p2 = t.player2Id ? getPlayer(t.player2Id) : null;
              const isLive = t.status === "active";
              const myTable =
                (t.player1Id === myMemberId || t.player2Id === myMemberId) && isLive;

              return (
                <div
                  key={t.id}
                  className={cn(
                    "border rounded-[10px] px-[10px] pt-[9px] pb-2",
                    myTable
                      ? "bg-game-banner border-game-banner-border"
                      : "bg-card border-border",
                  )}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-[.4px]",
                        myTable ? "text-primary" : "text-table-header",
                      )}
                    >
                      TABLE {t.tableNumber}
                    </span>
                    {isLive ? (
                      <span className="text-[9px] font-bold text-secondary">
                        ● LIVE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-card-border">
                        ● Idle
                      </span>
                    )}
                  </div>

                  {(
                    [
                      { player: p1, score: t.score1 },
                      { player: p2, score: t.score2 },
                    ] as const
                  ).map(({ player, score }, pi) => (
                    <div
                      key={pi}
                      className={cn(
                        "flex justify-between items-center",
                        pi === 0 && "mb-0.5",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[12px] max-w-[60%] truncate",
                          !player
                            ? "text-foreground"
                            : player.id === myMemberId
                              ? "text-me font-bold text-table-header"
                              : "text-foreground",
                        )}
                      >
                        {player ? player.name : "N/A"}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-extrabold ml-1",
                          score > 0 ? "text-score-active" : "text-score-dim",
                        )}
                      >
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
