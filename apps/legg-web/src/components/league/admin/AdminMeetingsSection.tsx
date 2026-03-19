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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Meeting</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="w-28 text-center text-xs px-2">
                Status
              </TableHead>
              <TableHead className="w-16 px-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableRow
                  key={slot.meetingNumber}
                  className={isCurrent ? "bg-primary/5" : ""}
                >
                  <TableCell className="py-2">
                    <span
                      className={cn(
                        "text-sm text-left whitespace-nowrap",
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
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground px-2 py-2 whitespace-nowrap">
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
                  </TableCell>
                  <TableCell className="text-center px-2 py-2">
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
                  </TableCell>
                  <TableCell className="px-1 py-2">
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
                            aria-label={
                              status === "active" ? "Pause" : "Resume"
                            }
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
};
