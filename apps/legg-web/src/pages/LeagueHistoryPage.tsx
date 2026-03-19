import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LeagueHistoryPage = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: league } = trpc.league.getById.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  const { data: allMatches = [], isLoading } = trpc.meeting.getAllMatchHistory.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  // Default filter to current user's member id
  const myMemberId = league?.myMemberId ?? null;
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Once we know the current user's memberId, set it as default (only once)
  useEffect(() => {
    if (myMemberId && selectedMemberId === null) {
      setSelectedMemberId(myMemberId);
    }
  }, [myMemberId, selectedMemberId]);

  const filteredMatches = useMemo(() => {
    if (!selectedMemberId) return allMatches;
    return allMatches.filter(
      (m) => m.player1Id === selectedMemberId || m.player2Id === selectedMemberId,
    );
  }, [allMatches, selectedMemberId]);

  // Group by meetingNumber, sorted descending
  const meetingGroups = useMemo(() => {
    const map = new Map<number, typeof filteredMatches>();
    for (const match of filteredMatches) {
      const list = map.get(match.meetingNumber) ?? [];
      list.push(match);
      map.set(match.meetingNumber, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filteredMatches]);

  const members = league?.members ?? [];

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto text-foreground pb-16">
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-[57px] z-40">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage
                className="cursor-pointer hover:underline"
                onClick={() => history.back()}
              >
                History
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{league?.name ?? "…"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">{league?.name ?? "League"}</h1>

        {/* Player filter */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedMemberId ?? "__all__"}
            onValueChange={(v) =>
              setSelectedMemberId(v === "__all__" ? null : v)
            }
          >
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="All players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All players</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.userName}
                  {m.id === myMemberId ? " (me)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMemberId !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setSelectedMemberId(null)}
            >
              Clear
            </Button>
          )}
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {!isLoading && meetingGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches found.</p>
        )}

        {meetingGroups.map(([meetingNumber, matches]) => (
          <div key={meetingNumber} className="space-y-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
              Meeting #{meetingNumber}
            </h2>
            <div className="flex flex-col gap-1">
              {matches.map((match) => {
                const iWon =
                  selectedMemberId !== null && match.winnerId === selectedMemberId;
                const iLost =
                  selectedMemberId !== null &&
                  match.winnerId !== null &&
                  match.winnerId !== selectedMemberId &&
                  (match.player1Id === selectedMemberId ||
                    match.player2Id === selectedMemberId);

                return (
                  <div
                    key={match.id}
                    className="flex items-center gap-2 bg-card border border-card-border rounded px-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground w-8 shrink-0">
                      T{match.tableNumber}
                    </span>
                    <span
                      className={
                        match.winnerId === match.player1Id
                          ? "font-semibold text-green-600 dark:text-green-400"
                          : ""
                      }
                    >
                      {match.player1Name ?? "—"}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {match.score1} – {match.score2}
                    </span>
                    <span
                      className={
                        match.winnerId === match.player2Id
                          ? "font-semibold text-green-600 dark:text-green-400"
                          : ""
                      }
                    >
                      {match.player2Name ?? "—"}
                    </span>
                    {iWon && (
                      <span className="ml-auto text-green-600 dark:text-green-400 font-semibold">
                        W
                      </span>
                    )}
                    {iLost && (
                      <span className="ml-auto text-red-500 dark:text-red-400 font-semibold">
                        L
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
