import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Loader, Logs, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import nineBallUrl from "@/assets/9ball.svg";
import eightBallUrl from "@/assets/8ball.svg";

const ME_ID = 1;

const INIT_PLAYERS = [
  { id: 1, name: "Alex M.", wins: 0, losses: 7, pts: 1 },
  { id: 2, name: "Jordan K.", wins: 4, losses: 3, pts: 9 },
  { id: 3, name: "Sam R.", wins: 6, losses: 1, pts: 14 },
  { id: 4, name: "Casey T.", wins: 3, losses: 4, pts: 7 },
  { id: 5, name: "Morgan L.", wins: 7, losses: 0, pts: 16 },
  { id: 6, name: "Riley B.", wins: 2, losses: 5, pts: 5 },
  { id: 7, name: "Taylor W.", wins: 4, losses: 3, pts: 10 },
  { id: 8, name: "Jamie D.", wins: 1, losses: 6, pts: 3 },
  { id: 9, name: "Drew P.", wins: 3, losses: 3, pts: 8 },
  { id: 10, name: "Quinn H.", wins: 5, losses: 2, pts: 11 },
  { id: 11, name: "Parker N.", wins: 5, losses: 2, pts: 13 },
  { id: 12, name: "Blake S.", wins: 2, losses: 5, pts: 4 },
  { id: 13, name: "Avery C.", wins: 7, losses: 1, pts: 17 },
  { id: 14, name: "Reese M.", wins: 6, losses: 2, pts: 15 },
  { id: 15, name: "Skyler J.", wins: 5, losses: 3, pts: 12 },
  { id: 16, name: "Finley O.", wins: 4, losses: 4, pts: 10 },
  { id: 17, name: "Harper V.", wins: 3, losses: 5, pts: 7 },
  { id: 18, name: "Emerson G.", wins: 3, losses: 5, pts: 6 },
  { id: 19, name: "Rowan F.", wins: 2, losses: 6, pts: 5 },
  { id: 20, name: "Sage A.", wins: 2, losses: 6, pts: 4 },
  { id: 21, name: "Phoenix L.", wins: 1, losses: 7, pts: 3 },
  { id: 22, name: "Indigo T.", wins: 1, losses: 7, pts: 2 },
  { id: 23, name: "River K.", wins: 1, losses: 7, pts: 2 },
  { id: 24, name: "Nova B.", wins: 0, losses: 8, pts: 1 },
];

const initTables = () =>
  Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    p1: null as number | null,
    p2: null as number | null,
    s1: 0,
    s2: 0,
    phase: "idle" as "idle" | "active" | "done",
  }));

interface IScorePillProps {
  v: number;
  active: boolean;
  winner: boolean;
  onPick: () => void;
}

const ScorePill = ({ v, active, winner, onPick }: IScorePillProps) => (
  <button
    onClick={onPick}
    className={cn(
      "w-9 h-9 rounded-full text-sm font-bold cursor-pointer transition-opacity border-2",
      active
        ? winner
          ? "border-secondary bg-secondary/15 text-secondary"
          : "border-primary text-primary"
        : "border-border bg-transparent text-muted-foreground",
    )}
  >
    {v}
  </button>
);

export const LeaguePage = () => {
  const { data: session, isPending } = useSession();

  const [players, setPlayers] = useState(
    INIT_PLAYERS.map((p) => ({
      ...p,
      status: "available" as "available" | "ready" | "playing",
    })),
  );
  const [tables, setTables] = useState(initTables());
  const [simPast7, setSimPast7] = useState(false);
  const [modal, setModal] = useState<number | null>(null);
  const [sv, setSv] = useState({ s1: 0, s2: 0 });
  const [readyPending, setReadyPending] = useState(false);
  const [standingsOpen, setStandingsOpen] = useState(
    () => sessionStorage.getItem("standings-open") !== "false",
  );
  const [tablesOpen, setTablesOpen] = useState(
    () => sessionStorage.getItem("tables-open") !== "false",
  );
  const [is9ball, setIs9ball] = useState(
    () => sessionStorage.getItem("format") === "9ball",
  );
  const [optOutModal, setOptOutModal] = useState(false);
  const [standingsExpanded, setStandingsExpanded] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const gp = (id: number) => players.find((p) => p.id === id);
  const me = gp(ME_ID);
  const myReady = me?.status === "ready";
  const readyList = players.filter((p) => p.status === "ready");
  const now = new Date();
  const isPast7 = simPast7 || now.getHours() >= 19;
  const canDraw = isPast7 && readyList.length >= 2;
  const sorted = [...players].sort((a, b) => b.pts - a.pts || b.wins - a.wins);

  const INITIAL_LIMIT = 10;
  const BEFORE_ME = 4;
  const meIndex = sorted.findIndex((p) => p.id === ME_ID);
  const needsTruncation = sorted.length > INITIAL_LIMIT;

  type ScoreboardRow =
    | { kind: "player"; player: (typeof sorted)[number]; rank: number }
    | { kind: "hidden"; count: number };

  const visibleRows: ScoreboardRow[] = (() => {
    if (!needsTruncation || standingsExpanded) {
      return sorted.map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
    }
    if (meIndex < INITIAL_LIMIT) {
      return sorted
        .slice(0, INITIAL_LIMIT)
        .map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
    }
    const afterCount = INITIAL_LIMIT - BEFORE_ME - 2;
    const hiddenCount = meIndex - BEFORE_ME;
    return [
      ...sorted
        .slice(0, BEFORE_ME)
        .map((p, i) => ({ kind: "player" as const, player: p, rank: i + 1 })),
      { kind: "hidden" as const, count: hiddenCount },
      { kind: "player" as const, player: sorted[meIndex]!, rank: meIndex + 1 },
      ...sorted.slice(meIndex + 1, meIndex + 1 + afterCount).map((p, i) => ({
        kind: "player" as const,
        player: p,
        rank: meIndex + 2 + i,
      })),
    ];
  })();
  const myActiveTable = tables.find(
    (t) => (t.p1 === ME_ID || t.p2 === ME_ID) && t.phase === "active",
  );
  const raceTo = is9ball ? 7 : 3;

  const handleToggleReady = () => {
    setReadyPending(true);
    const nextReady = me?.status !== "ready";
    setTimeout(() => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === ME_ID
            ? { ...p, status: p.status === "ready" ? "available" : "ready" }
            : p,
        ),
      );
      toast(
        nextReady
          ? "You're ready to play!"
          : "Taking a break — see you soon! 😴",
      );
      setReadyPending(false);
    }, 1000);
  };

  const demoAllReady = () =>
    setPlayers((prev) =>
      prev.map((p) =>
        p.status === "available" ? { ...p, status: "ready" } : p,
      ),
    );

  const draw = () => {
    const pool = players.filter((p) => p.status === "ready");
    const idle = tables.filter((t) => t.phase === "idle");
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    let nTables = tables.map((t) => ({ ...t }));
    let nPlayers = players.map((p) => ({ ...p }));
    let ti = 0;
    for (let i = 0; i + 1 < shuffled.length && ti < idle.length; i += 2, ti++) {
      const a = shuffled[i]!,
        b = shuffled[i + 1]!,
        tbl = idle[ti]!;
      nTables = nTables.map((t) =>
        t.id === tbl.id
          ? { ...t, p1: a.id, p2: b.id, s1: 0, s2: 0, phase: "active" as const }
          : t,
      );
      nPlayers = nPlayers.map((p) =>
        p.id === a.id || p.id === b.id
          ? { ...p, status: "playing" as const }
          : p,
      );
    }
    setTables(nTables);
    setPlayers(nPlayers);
  };

  const updateTableScore = (tid: number, side: "s1" | "s2", delta: number) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, [side]: Math.max(0, Math.min(raceTo - 1, t[side] + delta)) }
          : t,
      ),
    );
  };

  const shufflePlayer = () => {
    if (!myActiveTable) return;
    const t = myActiveTable;
    const available = players.filter(
      (p) => p.status === "available" && p.id !== ME_ID,
    );
    if (!available.length) return;
    const replacement =
      available[Math.floor(Math.random() * available.length)]!;
    const mySide = t.p1 === ME_ID ? "p1" : "p2";
    setTables((prev) =>
      prev.map((tbl) =>
        tbl.id === t.id ? { ...tbl, [mySide]: replacement.id } : tbl,
      ),
    );
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === ME_ID) return { ...p, status: "available" as const };
        if (p.id === replacement.id)
          return { ...p, status: "playing" as const };
        return p;
      }),
    );
    setOptOutModal(false);
    toast(
      "Swapped in " + replacement.name.split(" ")[0] + " — enjoy your break!",
    );
  };

  const takeBreak = () => {
    if (!myActiveTable) return;
    const t = myActiveTable;
    const otherId = t.p1 === ME_ID ? t.p2 : t.p1;
    setTables((prev) =>
      prev.map((tbl) =>
        tbl.id === t.id
          ? { ...tbl, p1: null, p2: null, s1: 0, s2: 0, phase: "idle" as const }
          : tbl,
      ),
    );
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === ME_ID || p.id === otherId)
          return { ...p, status: "available" as const };
        return p;
      }),
    );
    setOptOutModal(false);
    toast("Taking a break — see you soon! 😴");
  };

  const openModal = (tid: number) => {
    const t = tables.find((t) => t.id === tid);
    if (!t) return;
    setSv({ s1: t.s1, s2: t.s2 });
    setModal(tid);
  };

  const submitScore = () => {
    const { s1, s2 } = sv;
    if ((s1 !== raceTo && s2 !== raceTo) || (s1 === raceTo && s2 === raceTo))
      return;
    const t = tables.find((t) => t.id === modal);
    if (!t || t.p1 === null || t.p2 === null) return;
    const wId = s1 === 3 ? t.p1 : t.p2;
    const lId = s1 === 3 ? t.p2 : t.p1;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === wId)
          return {
            ...p,
            wins: p.wins + 1,
            pts: p.pts + 2,
            status: "available" as const,
          };
        if (p.id === lId)
          return {
            ...p,
            losses: p.losses + 1,
            pts: p.pts + 1,
            status: "available" as const,
          };
        return p;
      }),
    );
    setTables((prev) =>
      prev.map((t) =>
        t.id === modal ? { ...t, s1, s2, phase: "done" as const } : t,
      ),
    );
    setModal(null);
  };

  return (
    <div className="w-full sm:max-w-sm sm:mx-auto text-foreground pb-16">
      {/* HEADER */}
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] flex items-center justify-between sticky top-0 z-50">
        <div className="flex w-full justify-between items-center gap-1.5">
          {session.user.name && (
            <h2 className="text-foreground m-0 font-mono font-extrabold tracking-widest">
              Welcome{" "}
              <span className="font-semibold text-foreground">
                {session.user.name.split(" ")[0]}
              </span>
            </h2>
          )}
          <div>
            <div className="text-[10px] font-mono text-primary font-semibold tracking-[1.5px] uppercase leading-none">
              8-Ball League
            </div>
            <h2 className="font-mono font-extrabold text-foreground leading-tight">
              Lincoln TLV
            </h2>
          </div>
        </div>
      </header>

      <div className="px-[13px] pt-[14px]">
        <Button
          onClick={handleToggleReady}
          disabled={readyPending}
          variant={
            myReady || myActiveTable?.phase === "active" ? "outline" : "default"
          }
          size="lg"
          className="w-full mb-4"
        >
          {readyPending ? (
            <Loader className="animate-spin" />
          ) : myReady || myActiveTable?.phase === "active" ? (
            "Take a Break"
          ) : (
            "Ready to Play"
          )}
        </Button>

        {readyList.length > 0 && (
          <div className="bg-card border border-border rounded-[10px] px-[13px] py-[10px] mb-[13px] text-xs">
            <div className="text-primary mb-[7px]">
              ✋ Ready —{" "}
              {readyList.map((p) => p.name.split(" ")[0]).join(" · ")}
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isPast7 && (
                <Button
                  onClick={() => setSimPast7(true)}
                  variant="ghost"
                  size="sm"
                  className="bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-[11px] h-auto py-1 px-[10px] rounded-[10px]"
                >
                  Simulate 7 PM
                </Button>
              )}
              {canDraw && (
                <Button
                  onClick={draw}
                  variant="secondary"
                  size="sm"
                  className="text-[11px] h-auto py-1 px-3 rounded-[10px]"
                >
                  Draw Tables
                </Button>
              )}
              {!isPast7 && (
                <span className="text-muted-foreground text-[11px] leading-6">
                  Draw opens at 7:00 PM
                </span>
              )}
            </div>
          </div>
        )}

        {/* DEMO HELPER */}
        {readyList.length === 0 && (
          <Button
            onClick={demoAllReady}
            variant="ghost"
            className="w-full h-auto py-[9px] bg-transparent border border-dashed border-primary text-table-header text-xs mb-[14px] rounded-[10px]"
          >
            Demo: mark all players ready →
          </Button>
        )}

        {/* ACTIVE GAME BANNER */}
        {myActiveTable &&
          (() => {
            const t = myActiveTable;
            const p1 = t.p1 ? gp(t.p1) : null;
            const p2 = t.p2 ? gp(t.p2) : null;
            return (
              <div className="bg-card border border-card-border rounded-xl px-[14px] py-[11px] mb-[14px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-primary tracking-[1.5px] uppercase">
                    Your Game · Table {t.id}
                  </span>
                  <div className="flex items-center gap-[6px]">
                    <span className="text-sm">
                      <img
                        src={is9ball ? nineBallUrl : eightBallUrl}
                        alt="ball"
                        className="w-4 h-4"
                      />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[1px] whitespace-nowrap text-primary">
                      {is9ball ? "9-BALL" : "8-BALL"}
                    </span>
                    <Switch
                      checked={is9ball}
                      onCheckedChange={(v) => {
                        setIs9ball(v);
                        sessionStorage.setItem("format", v ? "9ball" : "8ball");
                      }}
                    />
                    <span className="text-[9px] font-bold text-secondary">
                      ● LIVE
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Player 1 */}
                  {(() => {
                    const player = p1;
                    const side = "s1" as const;
                    return (
                      <div className="flex-1 flex flex-col items-start gap-1.5">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            player?.id === ME_ID
                              ? "text-primary"
                              : "text-foreground",
                          )}
                        >
                          {player?.name ?? "N/A"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => updateTableScore(t.id, side, -1)}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            −
                          </Button>
                          <Button
                            onClick={() => updateTableScore(t.id, side, 1)}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Score */}
                  <div className="flex flex-col items-center gap-0.5">
                    <h2 className="text-[32px] font-extrabold text-foreground m-0 tracking-[2px] text-center min-w-[72px]">
                      <span
                        className={
                          t.s1 > 0 ? "text-score-active" : "text-score-dim"
                        }
                      >
                        {t.s1}
                      </span>
                      <span className="text-muted-foreground text-xl"> — </span>
                      <span
                        className={
                          t.s2 > 0 ? "text-score-active" : "text-score-dim"
                        }
                      >
                        {t.s2}
                      </span>
                    </h2>
                    <span className="text-[9px] text-primary uppercase tracking-[1px]">
                      Race to {raceTo}
                    </span>
                  </div>

                  {/* Player 2 */}
                  {(() => {
                    const player = p2;
                    const side = "s2" as const;
                    return (
                      <div className="flex-1 flex flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            player?.id === ME_ID
                              ? "text-secondary"
                              : "text-foreground",
                          )}
                        >
                          {player?.name ?? "N/A"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => updateTableScore(t.id, side, -1)}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            −
                          </Button>
                          <Button
                            onClick={() => updateTableScore(t.id, side, 1)}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={() => openModal(t.id)}
                    variant="default"
                    size="sm"
                  >
                    Submit Score
                  </Button>
                  <div className="flex items-center gap-1">
                    <p className="text-xs">Don't want to play?</p>
                    <Button
                      onClick={() => setOptOutModal(true)}
                      variant="link"
                      size="xs"
                      className="p-0"
                    >
                      Click here to opt out
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

        <Collapsible
          open={standingsOpen}
          onOpenChange={(open) => {
            setStandingsOpen(open);
            sessionStorage.setItem("standings-open", String(open));
          }}
          className="mb-6"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0 mb-4">
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
              <div className="grid grid-cols-[22px_1fr_28px_28px_36px] px-3 py-[7px] border-b border-muted text-[10px] text-table-header uppercase tracking-[.8px]">
                <span>#</span>
                <span>Player</span>
                <span className="text-center">W</span>
                <span className="text-center">L</span>
                <span className="text-right">Pts</span>
              </div>
              {visibleRows.map((row) => {
                if (row.kind === "hidden") {
                  return (
                    <div
                      key="hidden"
                      onClick={() => setStandingsExpanded(true)}
                      className="bg-neutral-800 px-3 py-1 border-b border-muted cursor-pointer hover:bg-muted/30 transition-colors"
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
                const isMe = p.id === ME_ID;
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
                      "grid grid-cols-[22px_1fr_28px_28px_36px] px-3 py-[9px] items-center",
                      "border-b border-muted last:border-b-0",
                      isMe && "bg-me-row",
                    )}
                  >
                    <span className={cn("text-[11px] font-extrabold", rankCol)}>
                      {rank}
                    </span>
                    <span
                      className={cn(
                        "text-[13px]",
                        isMe
                          ? "font-bold text-table-header"
                          : "font-normal text-foreground",
                      )}
                    >
                      {p.name}
                      {badge}
                    </span>
                    <span className="text-center text-emerald-500 text-[13px] font-semibold">
                      {p.wins}
                    </span>
                    <span className="text-center text-red-400 text-[13px] font-semibold">
                      {p.losses}
                    </span>
                    <span className="text-right text-secondary text-sm font-extrabold">
                      {p.pts}
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
                {standingsExpanded
                  ? "View Less"
                  : `View All (${sorted.length})`}
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* TABLES GRID */}
        <Collapsible
          open={tablesOpen}
          onOpenChange={(open) => {
            setTablesOpen(open);
            sessionStorage.setItem("tables-open", String(open));
          }}
          className="my-4"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0 mb-4">
            <h2 className="text-[11px] font-bold text-primary tracking-[1.5px] uppercase m-0 flex items-center">
              <Play className="w-4 h-4 mr-2" /> Tables
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tables.map((t) => {
                const p1 = t.p1 ? gp(t.p1) : null;
                const p2 = t.p2 ? gp(t.p2) : null;
                const isLive = t.phase === "active";
                const isDone = t.phase === "done";
                const myTable = (t.p1 === ME_ID || t.p2 === ME_ID) && isLive;

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "border rounded-[10px] px-[10px] pt-[9px] pb-2",
                      myTable
                        ? "bg-game-banner border-game-banner-border"
                        : isDone
                          ? "bg-card border-card-border"
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
                        TABLE {t.id}
                      </span>
                      {isLive && (
                        <span className="text-[9px] font-bold text-secondary">
                          ● LIVE
                        </span>
                      )}
                      {isDone && (
                        <span className="text-[9px] font-bold text-primary">
                          ✓ DONE
                        </span>
                      )}
                      {!isLive && !isDone && (
                        <span className="text-[9px] font-bold text-card-border">
                          ● Idle
                        </span>
                      )}
                    </div>

                    {(
                      [
                        { player: p1, score: t.s1, won: t.s1 === 3 && isDone },
                        { player: p2, score: t.s2, won: t.s2 === 3 && isDone },
                      ] as const
                    ).map(({ player, score, won }, pi) => (
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
                              : player.id === ME_ID
                                ? "text-me font-bold text-table-header"
                                : won
                                  ? "text-foreground font-bold"
                                  : "text-foreground",
                          )}
                        >
                          {player ? player.name : "N/A"}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-extrabold ml-1",
                            won
                              ? "text-secondary"
                              : score > 0
                                ? "text-score-active"
                                : "text-score-dim",
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* SCORE MODAL */}
      {modal !== null &&
        (() => {
          const t = tables.find((t) => t.id === modal);
          if (!t || t.p1 === null || t.p2 === null) return null;
          const p1 = gp(t.p1),
            p2 = gp(t.p2);
          const valid = (sv.s1 === raceTo) !== (sv.s2 === raceTo);
          return (
            <div
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-black/80 flex items-end z-[100]"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm sm:mx-auto bg-card border border-game-banner-border rounded-t-[18px] px-5 pt-[22px] pb-8"
              >
                <div className="text-center text-lg font-extrabold mb-0.5">
                  Submit Score
                </div>
                <div className="text-center text-xs text-primary mb-[22px]">
                  Table {t.id} · Race to {raceTo}
                </div>

                {[
                  { player: p1, key: "s1" as const },
                  { player: p2, key: "s2" as const },
                ].map(({ player, key }) => (
                  <div
                    key={key}
                    className="flex justify-between items-center mb-4"
                  >
                    <span
                      className={cn(
                        "text-[15px] font-bold",
                        player?.id === ME_ID ? "text-me" : "text-foreground",
                      )}
                    >
                      {player?.name}
                    </span>
                    <div className="flex gap-[7px]">
                      {Array.from({ length: raceTo + 1 }, (_, i) => i).map(
                        (v) => (
                          <ScorePill
                            key={v}
                            v={v}
                            active={sv[key] === v}
                            winner={v === raceTo && sv[key] === raceTo}
                            onPick={() =>
                              setSv((prev) => ({ ...prev, [key]: v }))
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                ))}

                {!valid && sv.s1 + sv.s2 > 0 && (
                  <p className="text-center text-red-400 text-xs mb-2.5">
                    One player must reach {raceTo} wins
                  </p>
                )}

                <Button
                  onClick={submitScore}
                  disabled={!valid}
                  className={cn(
                    "w-full h-auto py-[15px] text-base mt-1.5 rounded-[10px]",
                    valid
                      ? "bg-btn-primary text-btn-primary-foreground"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  Confirm Result
                </Button>
              </div>
            </div>
          );
        })()}

      {/* OPT-OUT MODAL */}
      {optOutModal &&
        myActiveTable &&
        (() => {
          const t = myActiveTable;
          const hasAvailable = players.some(
            (p) => p.status === "available" && p.id !== ME_ID,
          );
          return (
            <div
              onClick={() => setOptOutModal(false)}
              className="fixed inset-0 bg-black/80 flex items-end z-[100]"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm sm:mx-auto bg-card border border-game-banner-border rounded-t-[18px] px-5 pt-[22px] pb-8"
              >
                <div className="text-center text-lg font-extrabold mb-0.5">
                  Opt Out
                </div>
                <div className="text-center text-xs text-primary mb-[22px]">
                  Table {t.id}
                </div>

                <Button
                  onClick={shufflePlayer}
                  disabled={!hasAvailable}
                  variant="outline"
                  className={cn(
                    "w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px]",
                    hasAvailable
                      ? "bg-tinted-btn-bg border-tinted-btn-border text-tinted-btn-text"
                      : "bg-muted border-border text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <span className="text-sm font-bold">
                    {hasAvailable
                      ? "Shuffle player"
                      : "Shuffle player (no one available)"}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Replace me with an available player
                  </span>
                </Button>

                <Button
                  onClick={takeBreak}
                  variant="outline"
                  className="w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px] bg-rose-950 border-rose-900 text-rose-300"
                >
                  <span className="text-sm font-bold">Take a break</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Cancel this game, free the table
                  </span>
                </Button>

                <Button
                  onClick={() => setOptOutModal(false)}
                  variant="ghost"
                  className="w-full h-auto py-[10px] text-muted-foreground text-[13px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
