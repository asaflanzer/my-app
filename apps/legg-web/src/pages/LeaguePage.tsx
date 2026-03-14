import { useState, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Loader, Logs, Tablet } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { isAdmin } from "@/lib/admin";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";
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

type PlayerStatus = "available" | "ready" | "playing";

export const LeaguePage = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: session, isPending: sessionPending } = useSession();
  const userIsAdmin = isAdmin(session?.user.email);
  const { league, isLoading: leagueLoading, myMemberId } = useLeagueContext();

  const { data: activeMeeting, refetch: refetchMeeting } =
    trpc.meeting.getActive.useQuery(
      { leagueId: leagueId ?? "" },
      { enabled: !!leagueId, refetchInterval: 5000 },
    );

  const utils = trpc.useUtils();
  const invalidate = () => {
    void utils.meeting.getActive.invalidate({ leagueId: leagueId ?? "" });
    void utils.league.getById.invalidate({ leagueId: leagueId ?? "" });
  };

  const toggleReady = trpc.meeting.toggleReady.useMutation({
    onSuccess: (data) => {
      invalidate();
      toast(
        data.status === "ready"
          ? "You're ready to play!"
          : "Taking a break — see you soon!",
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const draw = trpc.meeting.draw.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const updateScore = trpc.meeting.updateScore.useMutation({
    onSuccess: () => void refetchMeeting(),
  });

  const submitScore = trpc.meeting.submitScore.useMutation({
    onSuccess: () => {
      invalidate();
      setModal(null);
      toast("Score submitted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const takeBreak = trpc.meeting.takeBreak.useMutation({
    onSuccess: () => {
      invalidate();
      setOptOutModal(false);
      toast("Taking a break — see you soon!");
    },
    onError: (e) => toast.error(e.message),
  });

  const shufflePlayer = trpc.meeting.shufflePlayer.useMutation({
    onSuccess: () => {
      invalidate();
      setOptOutModal(false);
      toast("Swapped in — enjoy your break!");
    },
    onError: (e) => toast.error(e.message),
  });

  const [simPast7, setSimPast7] = useState(false);
  const [modal, setModal] = useState<string | null>(null); // tableId
  const [sv, setSv] = useState({ s1: 0, s2: 0 });
  const [standingsOpen, setStandingsOpen] = useState(
    () => sessionStorage.getItem("standings-open") !== "false",
  );
  const [tablesOpen, setTablesOpen] = useState(
    () => sessionStorage.getItem("tables-open") !== "false",
  );
  const [is9ball, setIs9ball] = useState(false);
  const [optOutModal, setOptOutModal] = useState(false);
  const [standingsExpanded, setStandingsExpanded] = useState(false);

  // Build enriched player list (members + meeting status)
  const players = useMemo(() => {
    if (!league) return [];
    const statusMap = new Map<string, PlayerStatus>();
    if (activeMeeting) {
      for (const mp of activeMeeting.players) {
        statusMap.set(mp.memberId, mp.status as PlayerStatus);
      }
    }
    return league.members.map((m) => ({
      id: m.id,
      name: m.userName,
      wins: m.wins,
      losses: m.losses,
      pts: m.pts,
      disabled: m.disabled,
      status: statusMap.get(m.id) ?? ("available" as PlayerStatus),
    }));
  }, [league, activeMeeting]);

  const tables = activeMeeting?.tables ?? [];

  if (sessionPending || leagueLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const gp = (id: string) => players.find((p) => p.id === id);
  const me = myMemberId ? gp(myMemberId) : undefined;
  const myReady = me?.status === "ready";
  const readyList = players.filter((p) => p.status === "ready");
  const now = new Date();
  const isPast7 = simPast7 || now.getHours() >= 19;
  const canDraw = isPast7 && readyList.length >= 2;
  const raceTo = is9ball ? 7 : 3;

  const sorted = [...players].sort((a, b) => {
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
    return b.pts - a.pts || b.wins - a.wins;
  });

  const INITIAL_LIMIT = 10;
  const BEFORE_ME = 4;
  const meIndex = sorted.findIndex((p) => p.id === myMemberId);
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
    (t) =>
      (t.player1Id === myMemberId || t.player2Id === myMemberId) &&
      t.status === "active",
  );

  const handleToggleReady = () => {
    if (!activeMeeting || !leagueId) return;
    toggleReady.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  const handleDraw = () => {
    if (!activeMeeting || !leagueId) return;
    draw.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  const handleUpdateTableScore = (
    tableId: string,
    player: "1" | "2",
    delta: 1 | -1,
  ) => {
    updateScore.mutate({ tableId, player, delta, raceTo });
  };

  const openModal = (tableId: string) => {
    const t = tables.find((t) => t.id === tableId);
    if (!t) return;
    setSv({ s1: t.score1, s2: t.score2 });
    setModal(tableId);
  };

  const handleSubmitScore = () => {
    if (!modal || !activeMeeting || !leagueId) return;
    submitScore.mutate({
      tableId: modal,
      meetingId: activeMeeting.id,
      leagueId,
      raceTo,
    });
  };

  const handleTakeBreak = () => {
    if (!activeMeeting || !leagueId) return;
    takeBreak.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  const handleShufflePlayer = () => {
    if (!activeMeeting || !leagueId) return;
    shufflePlayer.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  return (
    <div className="w-full sm:max-w-sm sm:mx-auto text-foreground pb-16">
      {/* HEADER */}
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50 flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate("/leagues")}>Leagues</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{league?.name ?? "League"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {userIsAdmin && (
          <Button
            size="xs"
            className="bg-amber-500 text-white"
            onClick={() => navigate(`/league/${leagueId}/admin`)}
          >
            Admin
          </Button>
        )}
      </header>

      <div className="px-[13px] pt-[14px]">
        {!activeMeeting ? (
          <div className="text-center text-neutral-500 text-sm py-8">
            No active meeting tonight. Check back later or ask the admin to
            activate one.
          </div>
        ) : activeMeeting.status === "idle" ? (
          <div className="text-center text-muted-foreground text-sm py-8 border border-border rounded-xl">
            Meeting #{activeMeeting.meetingNumber} is paused.
            <br />
            <span className="text-xs">Wait for the host to resume.</span>
          </div>
        ) : (
          <>
            <Button
              onClick={handleToggleReady}
              disabled={toggleReady.isPending}
              variant={
                myReady || myActiveTable?.status === "active"
                  ? "outline"
                  : "default"
              }
              size="lg"
              className="w-full mb-4 font-mono text-xs"
            >
              {toggleReady.isPending ? (
                <Loader className="animate-spin" />
              ) : myReady || myActiveTable?.status === "active" ? (
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
                      onClick={handleDraw}
                      disabled={draw.isPending}
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

            {/* ACTIVE GAME BANNER */}
            {myActiveTable &&
              (() => {
                const t = myActiveTable;
                const p1 = t.player1Id ? gp(t.player1Id) : null;
                const p2 = t.player2Id ? gp(t.player2Id) : null;
                return (
                  <div className="bg-card border border-card-border rounded-xl px-[14px] py-[11px] my-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-primary tracking-[1.5px] uppercase">
                        Your Game · Table {t.tableNumber}
                      </span>
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[9px] font-bold uppercase tracking-[1px] whitespace-nowrap text-foreground">
                          {is9ball ? "9-BALL" : "8-BALL"}
                        </span>
                        <Switch
                          size="xs"
                          checked={is9ball}
                          onCheckedChange={setIs9ball}
                        />
                        <span className="text-[9px] font-bold text-secondary">
                          ● LIVE
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Player 1 */}
                      {(() => {
                        return (
                          <div className="flex-1 flex flex-col items-start gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {p1?.name ?? "N/A"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                onClick={() =>
                                  handleUpdateTableScore(t.id, "1", -1)
                                }
                                variant="ghost"
                                size="icon"
                                className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                              >
                                −
                              </Button>
                              <Button
                                onClick={() =>
                                  handleUpdateTableScore(t.id, "1", 1)
                                }
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
                              t.score1 > 0
                                ? "text-score-active"
                                : "text-score-dim"
                            }
                          >
                            {t.score1}
                          </span>
                          <span className="text-muted-foreground text-xl">
                            {" "}
                            —{" "}
                          </span>
                          <span
                            className={
                              t.score2 > 0
                                ? "text-score-active"
                                : "text-score-dim"
                            }
                          >
                            {t.score2}
                          </span>
                        </h2>
                        <span className="text-[9px] text-primary uppercase tracking-[1px]">
                          Race to {raceTo}
                        </span>
                      </div>

                      {/* Player 2 */}
                      {(() => {
                        return (
                          <div className="flex-1 flex flex-col items-end gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                p2?.id === myMemberId
                                  ? "text-secondary"
                                  : "text-foreground",
                              )}
                            >
                              {p2?.name ?? "N/A"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                onClick={() =>
                                  handleUpdateTableScore(t.id, "2", -1)
                                }
                                variant="ghost"
                                size="icon"
                                className="w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                              >
                                −
                              </Button>
                              <Button
                                onClick={() =>
                                  handleUpdateTableScore(t.id, "2", 1)
                                }
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
          </>
        )}

        <Collapsible
          open={standingsOpen}
          onOpenChange={(open) => {
            setStandingsOpen(open);
            sessionStorage.setItem("standings-open", String(open));
          }}
          className="mb-6"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0 mt-4 mb-4">
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
                        p.disabled && "line-through opacity-40",
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
        {activeMeeting && (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tables.map((t) => {
                  const p1 = t.player1Id ? gp(t.player1Id) : null;
                  const p2 = t.player2Id ? gp(t.player2Id) : null;
                  const isLive = t.status === "active";
                  const isDone = t.status === "done";
                  const myTable =
                    (t.player1Id === myMemberId ||
                      t.player2Id === myMemberId) &&
                    isLive;

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
                          TABLE {t.tableNumber}
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
                          {
                            player: p1,
                            score: t.score1,
                            won: t.score1 === raceTo && isDone,
                          },
                          {
                            player: p2,
                            score: t.score2,
                            won: t.score2 === raceTo && isDone,
                          },
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
                                : player.id === myMemberId
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
        )}
      </div>

      {/* SCORE MODAL */}
      {modal !== null &&
        (() => {
          const t = tables.find((t) => t.id === modal);
          if (!t || !t.player1Id || !t.player2Id) return null;
          const p1 = gp(t.player1Id),
            p2 = gp(t.player2Id);
          const valid = (sv.s1 === raceTo) !== (sv.s2 === raceTo);
          return (
            <div
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-black/40 flex items-end z-[100]"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm sm:mx-auto bg-background border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8"
              >
                <div className="text-center text-lg font-extrabold mb-0.5">
                  Submit Score
                </div>
                <div className="text-center text-xs text-primary mb-[22px]">
                  Table {t.tableNumber} · Race to {raceTo}
                </div>

                {[
                  { player: p1, key: "s1" as const },
                  { player: p2, key: "s2" as const },
                ].map(({ player, key }) => (
                  <div
                    key={key}
                    className="flex justify-between items-center mb-4"
                  >
                    <span className="text-[15px] font-bold text-foreground">
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
                  onClick={handleSubmitScore}
                  disabled={!valid || submitScore.isPending}
                  className={cn(
                    "w-full h-auto py-[15px] text-base mt-1.5 rounded-[10px]",
                    valid
                      ? "bg-btn-primary text-btn-primary-foreground"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {submitScore.isPending ? "Submitting…" : "Confirm Result"}
                </Button>
              </div>
            </div>
          );
        })()}

      {/* OPT-OUT MODAL */}
      {optOutModal &&
        myActiveTable &&
        (() => {
          const hasAvailable = players.some(
            (p) => p.status === "available" && p.id !== myMemberId,
          );
          return (
            <div
              onClick={() => setOptOutModal(false)}
              className="fixed inset-0 bg-black/40 flex items-end z-[100]"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm sm:mx-auto bg-background border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8"
              >
                <div className="text-center text-lg font-extrabold mb-4">
                  Opt Out
                </div>

                <Button
                  onClick={handleShufflePlayer}
                  disabled={!hasAvailable || shufflePlayer.isPending}
                  variant="outline"
                  className={cn(
                    "w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px]",
                    hasAvailable
                      ? "bg-tinted-btn-bg border-tinted-btn-border text-tinted-btn-text"
                      : "bg-muted border-border text-foreground cursor-not-allowed",
                  )}
                >
                  <span className="text-sm font-bold">
                    {hasAvailable
                      ? "Shuffle player"
                      : "Shuffle player (no one available)"}
                  </span>
                  <span className="text-[11px] text-foreground font-normal">
                    Replace me with an available player
                  </span>
                </Button>

                <Button
                  onClick={handleTakeBreak}
                  disabled={takeBreak.isPending}
                  variant="outline"
                  className="w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px] bg-rose-950 border-rose-900 text-foreground"
                >
                  <span className="text-sm font-bold">Take a break</span>
                  <span className="text-[11px] text-foreground font-normal">
                    Cancel this game, free the table
                  </span>
                </Button>

                <Button
                  onClick={() => setOptOutModal(false)}
                  variant="ghost"
                  className="w-full h-auto py-[10px] text-[13px]"
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
