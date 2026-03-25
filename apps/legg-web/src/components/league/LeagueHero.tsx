import { useState } from "react";
import { Loader, MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useNextMeeting } from "@/hooks/useNextMeeting";
import { useMeetingActions } from "@/hooks/useMeetingActions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScorePill } from "@/components/league/ScorePill";

export const LeagueHero = () => {
  const {
    league,
    myMemberId,
    activeMeeting,
    players,
    myPlayer,
    myActiveTable,
  } = useLeagueContext();

  const [is9ball, setIs9ball] = useState(false);
  const [simPast7, setSimPast7] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [sv, setSv] = useState({ s1: 0, s2: 0 });
  const [optOutModal, setOptOutModal] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const raceTo = is9ball
    ? (league?.raceTo9ball ?? 7)
    : (league?.raceTo8ball ?? 3);

  const {
    toggleReady,
    draw,
    submitScore,
    takeBreak,
    shufflePlayer,
    leaveLeague,
    handleToggleReady,
    handleDraw,
    handleUpdateTableScore,
    handleSubmitScore,
    handleTakeBreak,
    handleShufflePlayer,
    handleLeaveLeague,
  } = useMeetingActions({
    activeMeeting,
    raceTo,
    onScoreSubmitted: () => setModal(null),
    onTakeBreak: () => setOptOutModal(false),
    onShufflePlayer: () => setOptOutModal(false),
  });

  const nextMeeting = useNextMeeting(league);

  const now = new Date();
  const isPast7 = simPast7 || now.getHours() >= 19;
  const readyList = players.filter((p) => p.status === "ready");
  const canDraw = isPast7 && readyList.length >= 2;
  const myReady = myPlayer?.status === "ready";

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const openModal = (tableId: string) => {
    const t = activeMeeting?.tables.find((t) => t.id === tableId);
    if (!t) return;
    setSv({ s1: t.score1, s2: t.score2 });
    setModal(tableId);
  };

  return (
    <>
      <div className="px-[13px] pt-[20px]">
        {!activeMeeting ? (
          !league?.hasStarted && myMemberId && !league?.isAdmin ? (
            <div className="text-center text-neutral-500 text-sm pt-8 space-y-3">
              <div>
                The next league starts on
                <div className="font-medium text-foreground mt-0.5">
                  {nextMeeting?.label ?? league?.startDate ?? "TBD"}
                </div>
              </div>
              {nextMeeting && (
                <a
                  href={nextMeeting.calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                >
                  Add to Google Calendar
                </a>
              )}
              <div>
                <button
                  onClick={() => setShowLeaveDialog(true)}
                  className="text-xs text-rose-500 underline underline-offset-2"
                >
                  Opt out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center text-neutral-500 text-sm pt-8">
                No active meeting right now.
              </div>
              <div className="text-center text-neutral-500 text-sm py-4">
                {nextMeeting ? (
                  <>
                    Next meeting is on
                    <div className="font-medium text-foreground mt-0.5">
                      {nextMeeting.label}
                    </div>
                    <a
                      href={nextMeeting.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary underline underline-offset-2"
                    >
                      Add to Google Calendar
                    </a>
                  </>
                ) : (
                  "Check back later or ask the admin to activate one."
                )}
              </div>
            </>
          )
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
              className="w-full mb-4 text-xs"
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
                  {readyList.map((p) => p.name?.split(" ")[0]).join(" · ")}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isPast7 && (
                    <Button
                      onClick={() => setSimPast7(true)}
                      variant="ghost"
                      size="sm"
                      className="bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-[11px] h-auto py-2 px-[10px] rounded-[10px]"
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
                      className="text-[11px] h-auto py-2 px-3 rounded-[10px]"
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

            {myActiveTable &&
              (() => {
                const t = myActiveTable;
                const p1 = t.player1Id ? getPlayer(t.player1Id) : null;
                const p2 = t.player2Id ? getPlayer(t.player2Id) : null;
                return (
                  <div className="bg-card border border-card-border rounded-xl px-[14px] py-[11px] my-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-neutral-500 tracking-wider uppercase">
                        <span className="text-[11px] text-amber-500">
                          Table{" "}
                          <span className="text-[15px] text-amber-500">
                            {t.tableNumber}
                          </span>
                        </span>{" "}
                        Playing Now
                      </span>
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[11px] font-bold uppercase tracking-[1px] whitespace-nowrap text-foreground">
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
                      <div className="flex-1 flex flex-col items-start gap-1.5">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            p1?.id === myMemberId
                              ? "text-secondary"
                              : "text-foreground",
                          )}
                        >
                          {p1?.name ?? "N/A"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() =>
                              handleUpdateTableScore(t.id, "1", -1)
                            }
                            variant="ghost"
                            size="icon"
                            className="w-11 h-11 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleUpdateTableScore(t.id, "1", 1)}
                            variant="ghost"
                            size="icon"
                            className="w-11 h-11 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

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
                        <span className="text-[11px] text-primary uppercase tracking-[1px]">
                          Race to {raceTo}
                        </span>
                      </div>

                      {/* Player 2 */}
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
                            className="w-11 h-11 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleUpdateTableScore(t.id, "2", 1)}
                            variant="ghost"
                            size="icon"
                            className="w-11 h-11 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <Button
                        onClick={() => openModal(t.id)}
                        variant="default"
                        size="default"
                      >
                        Submit Score
                      </Button>
                      <div className="flex items-center gap-1">
                        <p className="text-xs">Don&apos;t want to play?</p>
                        <Button
                          onClick={() => setOptOutModal(true)}
                          variant="link"
                          size="xs"
                          className="px-2 py-1"
                        >
                          Opt out
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </>
        )}
      </div>

      {/* SCORE MODAL */}
      {modal !== null &&
        (() => {
          const t = activeMeeting?.tables.find((t) => t.id === modal);
          if (!t || !t.player1Id || !t.player2Id) return null;
          const p1 = getPlayer(t.player1Id);
          const p2 = getPlayer(t.player2Id);
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
                  onClick={() => handleSubmitScore(modal, sv.s1, sv.s2)}
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
                  className="w-full h-auto py-3 text-[13px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        })()}

      {/* LEAVE LEAGUE DIALOG */}
      {showLeaveDialog && (
        <div
          onClick={() => setShowLeaveDialog(false)}
          className="fixed inset-0 bg-black/40 flex items-end z-[100]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm sm:mx-auto bg-background border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8"
          >
            <div className="text-center text-lg font-extrabold mb-2">
              Leave League
            </div>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Are you sure you want to unregister from this league?
            </p>
            <Button
              onClick={handleLeaveLeague}
              disabled={leaveLeague.isPending}
              variant="destructive"
              className="w-full mb-2"
            >
              {leaveLeague.isPending ? "Leaving…" : "Yes, leave league"}
            </Button>
            <Button
              onClick={() => setShowLeaveDialog(false)}
              variant="ghost"
              className="w-full h-auto py-3 text-[13px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
