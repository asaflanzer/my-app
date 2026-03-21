import { useState } from "react";
import { addDays, format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader,
  Pause,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";

export const AdminMeetingsSection = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { league } = useLeagueContext();
  const {
    allMeetingSlots,
    currentSlotIndex,
    activatedMeetings,
    canStartMeeting,
    activateMeeting,
    pauseMeeting,
    resetMeetings,
    setConfirmComplete,
    editingDateMeetingId,
    setEditingDateMeetingId,
    editingDateValue,
    setEditingDateValue,
    pendingDates,
    startEditDate,
    handleSaveDate,
  } = useAdminContext();

  const [open, setOpen] = useState(true);

  if (!league) return null;

  return (
    <section className="space-y-3">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-0">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Meetings
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive ml-1"
            onClick={() => leagueId && resetMeetings.mutate({ leagueId })}
            disabled={resetMeetings.isPending}
            aria-label="Testing:Reset meetings"
          >
            {resetMeetings.isPending ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            )}
          </Button>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-muted-foreground">
              {activatedMeetings}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold">{league.regularMeetings}</span>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {open && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {allMeetingSlots.map((slot, idx) => {
            const isCurrent = idx === currentSlotIndex;
            const meeting = slot.data;
            const status = meeting?.status ?? null;
            const isCompleted = status === "done";
            const isStarted = !!meeting && status !== "inactive";

            const statusLabel =
              status === "active"
                ? "Active"
                : status === "paused"
                  ? "Paused"
                  : status === "done"
                    ? "Done"
                    : status === "inactive"
                      ? "Scheduled"
                      : "—";

            const editingId = meeting?.id ?? `slot-${slot.meetingNumber}`;

            return (
              <div
                key={slot.meetingNumber}
                className={cn(
                  "flex items-center justify-between px-3 py-2 border-b border-muted last:border-b-0",
                  isCurrent && "bg-primary/5",
                )}
              >
                {/* Left: meeting label + date */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className={cn(
                      "text-sm whitespace-nowrap",
                      isCurrent
                        ? "font-semibold"
                        : "font-medium text-muted-foreground",
                      meeting &&
                        "cursor-pointer hover:underline hover:text-foreground",
                    )}
                    onClick={() =>
                      meeting &&
                      navigate(`/league/${leagueId}/meeting/${meeting.id}`)
                    }
                  >
                    Meeting #{slot.meetingNumber}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {editingDateMeetingId === editingId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          autoFocus
                          value={editingDateValue}
                          className="text-xs bg-background border border-input rounded px-1 py-0.5 w-25"
                          onChange={(e) => setEditingDateValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleSaveDate(slot, meeting ?? null);
                            if (e.key === "Escape")
                              setEditingDateMeetingId(null);
                          }}
                        />
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleSaveDate(slot, meeting ?? null)}
                          aria-label="Save date"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span>
                          {meeting?.scheduledDate
                            ? format(
                                new Date(meeting.scheduledDate),
                                "dd.MM.yyyy",
                              )
                            : pendingDates.get(slot.meetingNumber)
                              ? format(
                                  new Date(
                                    pendingDates.get(slot.meetingNumber)!,
                                  ),
                                  "dd.MM.yyyy",
                                )
                              : league.startDate
                                ? format(
                                    addDays(
                                      new Date(league.startDate),
                                      (slot.meetingNumber - 1) * 7,
                                    ),
                                    "dd.MM.yyyy",
                                  )
                                : "—"}
                        </span>
                        {!isCompleted && (
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={() => startEditDate(slot, meeting ?? null)}
                            aria-label="Edit date"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      status === "active"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {statusLabel}
                  </span>
                  {!isCompleted && (
                    <div className="flex items-center gap-0.5">
                      {status === "inactive" ? (
                        isCurrent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              leagueId && activateMeeting.mutate({ leagueId })
                            }
                            disabled={
                              activateMeeting.isPending || !canStartMeeting
                            }
                            aria-label="Start meeting"
                          >
                            {activateMeeting.isPending ? (
                              <Loader className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            leagueId &&
                            meeting &&
                            pauseMeeting.mutate({
                              leagueId,
                              meetingId: meeting.id,
                            })
                          }
                          disabled={pauseMeeting.isPending}
                          aria-label={status === "active" ? "Pause" : "Resume"}
                        >
                          {status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {isStarted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() =>
                            meeting &&
                            setConfirmComplete({
                              id: meeting.id,
                              meetingNumber: slot.meetingNumber,
                            })
                          }
                          aria-label="Mark done"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
