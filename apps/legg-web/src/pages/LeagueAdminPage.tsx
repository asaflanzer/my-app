import { useState } from "react";
import { addDays, format } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Loader,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DatePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
}) => {
  const selected = value ? new Date(value) : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-44 justify-start text-left font-normal overflow-hidden",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {selected ? format(selected, "PPP") : "Pick a date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => onChange(d ? d.toISOString() : null)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const LeagueAdminPage = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { league, isLoading, refetch } = useLeagueContext();
  const [newEmail, setNewEmail] = useState("");
  const [meetingsOpen, setMeetingsOpen] = useState(true);
  const [playoffsOpen, setPlayoffsOpen] = useState(true);
  const [playersOpen, setPlayersOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableNumber, setEditingTableNumber] = useState("");
  const [confirmComplete, setConfirmComplete] = useState<{
    id: string;
    meetingNumber: number;
  } | null>(null);
  const [editingDateMeetingId, setEditingDateMeetingId] = useState<
    string | null
  >(null);
  const [editingDateValue, setEditingDateValue] = useState<string>("");
  const [pendingDates, setPendingDates] = useState<Map<number, string>>(
    new Map(),
  );

  const utils = trpc.useUtils();

  const updateSettings = trpc.league.updateSettings.useMutation({
    onSuccess: () => {
      void utils.league.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addMember = trpc.league.addMember.useMutation({
    onSuccess: () => {
      refetch();
      setNewEmail("");
      toast("Player added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = trpc.league.removeMember.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const toggleDisabled = trpc.league.toggleDisabled.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const leagueTablesList = trpc.league.listTables.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  const addTable = trpc.league.addTable.useMutation({
    onSuccess: () => {
      void utils.league.listTables.invalidate();
      setNewTableNumber("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTable = trpc.league.updateTable.useMutation({
    onSuccess: () => {
      void utils.league.listTables.invalidate();
      setEditingTableId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeTable = trpc.league.removeTable.useMutation({
    onSuccess: () => void utils.league.listTables.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const meetingList = trpc.meeting.list.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  const initializeMeetings = trpc.meeting.initialize.useMutation({
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast("Schedule saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  const activateMeeting = trpc.meeting.activate.useMutation({
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast("Meeting activated!");
      setTimeout(() => navigate(`/league/${leagueId}`), 1000);
    },
    onError: (e) => toast.error(e.message),
  });

  const pauseMeeting = trpc.meeting.togglePause.useMutation({
    onSuccess: () => void utils.meeting.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const completeMeeting = trpc.meeting.complete.useMutation({
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      setConfirmComplete(null);
      toast("Meeting completed!");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMeetings = trpc.meeting.reset.useMutation({
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast("Meetings reset!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMeetingDate = trpc.meeting.updateDate.useMutation({
    onSuccess: () => void utils.meeting.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteLeague = trpc.league.delete.useMutation({
    onSuccess: () => {
      toast("League deleted.");
      navigate("/leagues");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !league) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const { members } = league;
  const regularMeetingsList = (meetingList.data ?? []).filter(
    (m) => m.status !== "playoff",
  );
  const activatedMeetings = regularMeetingsList.length;
  const activatedPlayoffs = (meetingList.data ?? []).filter(
    (m) => m.status === "playoff",
  ).length;

  const canStartMeeting = !!league.startDate && !!league.maxPlayers;

  // Pre-populate all N meeting slots; find first non-done slot to highlight
  const allMeetingSlots = Array.from(
    { length: league.regularMeetings },
    (_, i) => {
      const num = i + 1;
      const data =
        meetingList.data?.find((m) => m.meetingNumber === num) ?? null;
      return { meetingNumber: num, data };
    },
  );
  const currentSlotIndex = allMeetingSlots.findIndex(
    (s) => !s.data || s.data.status !== "done",
  );

  const lastRegularMeeting =
    regularMeetingsList[regularMeetingsList.length - 1];
  const allRegularMeetingsDone =
    activatedMeetings >= league.regularMeetings &&
    !!lastRegularMeeting &&
    lastRegularMeeting.status === "done";
  const canActivatePlayoff = allRegularMeetingsDone && activatedPlayoffs === 0;

  const handleAddPlayer = () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !leagueId) return;
    addMember.mutate({ leagueId, email: trimmed });
  };

  const startEditTable = (table: { id: string; tableNumber: number }) => {
    setEditingTableId(table.id);
    setEditingTableNumber(String(table.tableNumber));
  };

  const handleSaveTable = () => {
    const num = parseInt(editingTableNumber, 10);
    if (!editingTableId || isNaN(num) || num < 1 || !leagueId) return;
    updateTable.mutate({ leagueId, tableId: editingTableId, tableNumber: num });
  };

  const startEditDate = (
    slot: { meetingNumber: number },
    meeting: { id: string; scheduledDate: string | null; createdAt: string } | null,
  ) => {
    const editingId = meeting?.id ?? `slot-${slot.meetingNumber}`;
    const dateStr = meeting?.scheduledDate
      ? format(new Date(meeting.scheduledDate), "yyyy-MM-dd")
      : (pendingDates.get(slot.meetingNumber) ??
        (league.startDate
          ? format(
              addDays(new Date(league.startDate), (slot.meetingNumber - 1) * 7),
              "yyyy-MM-dd",
            )
          : format(new Date(), "yyyy-MM-dd")));
    setEditingDateValue(dateStr);
    setEditingDateMeetingId(editingId);
  };

  const handleSaveDate = (
    slot: { meetingNumber: number },
    meeting: { id: string } | null,
  ) => {
    if (!editingDateValue) return;
    if (meeting) {
      updateMeetingDate.mutate({
        leagueId: leagueId!,
        meetingId: meeting.id,
        scheduledDate: new Date(editingDateValue).toISOString(),
      });
    } else {
      setPendingDates((prev) => {
        const next = new Map(prev);
        next.set(slot.meetingNumber, editingDateValue);
        return next;
      });
    }
    setEditingDateMeetingId(null);
  };

  const handleAddTable = () => {
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num < 1 || !leagueId) return;
    addTable.mutate({ leagueId, tableNumber: num });
  };

  return (
    <>
      <header className="bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate("/leagues")}>Leagues</button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button onClick={() => navigate(`/league/${leagueId}`)}>
                  {league.name}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Admin</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-widest">
          Admin
        </h1>

        {/* Section A: League Schedule */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            League Schedule
          </h2>
          <div className="flex flex-wrap gap-6">
            <DatePicker
              label="Start Date"
              value={league.startDate}
              onChange={(iso) =>
                updateSettings.mutate({ leagueId: league.id, startDate: iso })
              }
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Start Time
              </Label>
              <Input
                type="time"
                value={league.startTime}
                onChange={(e) =>
                  updateSettings.mutate({
                    leagueId: league.id,
                    startTime: e.target.value,
                  })
                }
                className="w-32"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Meetings
              </Label>
              <Input
                type="number"
                min={1}
                defaultValue={league.regularMeetings}
                onBlur={(e) =>
                  updateSettings.mutate({
                    leagueId: league.id,
                    regularMeetings: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-24"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Playoff
              </Label>
              <Input
                type="number"
                min={1}
                defaultValue={league.playoffMeetings}
                onBlur={(e) =>
                  updateSettings.mutate({
                    leagueId: league.id,
                    playoffMeetings: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-24"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Max players
              </Label>
              <Input
                type="number"
                min={1}
                defaultValue={league.maxPlayers}
                onBlur={(e) =>
                  updateSettings.mutate({
                    leagueId: league.id,
                    maxPlayers: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-24"
              />
            </div>
          </div>
          {(() => {
            const hasAnyMeeting = (meetingList.data?.length ?? 0) > 0;
            const hasStarted =
              meetingList.data?.some((m) => m.status !== "inactive") ?? false;
            if (hasStarted) return null;
            return (
              <div>
                <Button
                  onClick={() =>
                    leagueId &&
                    initializeMeetings.mutate({ leagueId })
                  }
                  disabled={
                    initializeMeetings.isPending || !league.startDate
                  }
                >
                  {initializeMeetings.isPending && (
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {hasAnyMeeting ? "Update" : "Continue"}
                </Button>
              </div>
            );
          })()}
        </section>

        <Separator />

        {/* Section B: Meetings */}
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
              onClick={() => setMeetingsOpen((o) => !o)}
            >
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground">
                  {activatedMeetings}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-bold">{league.regularMeetings}</span>
              </div>
              {meetingsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          {meetingsOpen && (
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
                            navigate(
                              `/league/${leagueId}/meeting/${meeting.id}`,
                            )
                          }
                        >
                          Meeting #{slot.meetingNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground px-2 py-2 whitespace-nowrap">
                        {(() => {
                          const editingId =
                            meeting?.id ?? `slot-${slot.meetingNumber}`;
                          return editingDateMeetingId === editingId ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                autoFocus
                                value={editingDateValue}
                                className="text-xs bg-background border border-input rounded px-1 py-0.5 w-32"
                                onChange={(e) =>
                                  setEditingDateValue(e.target.value)
                                }
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
                                onClick={() =>
                                  handleSaveDate(slot, meeting ?? null)
                                }
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
                                  onClick={() =>
                                    startEditDate(slot, meeting ?? null)
                                  }
                                  aria-label="Edit date"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })()}
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
                                    leagueId &&
                                    activateMeeting.mutate({ leagueId })
                                  }
                                  disabled={
                                    activateMeeting.isPending ||
                                    !canStartMeeting
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

        <Separator />

        {/* Section C: Playoffs */}
        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setPlayoffsOpen((o) => !o)}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Playoffs
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground">
                  {activatedPlayoffs}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-bold">{league.playoffMeetings}</span>
              </div>
              {playoffsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {playoffsOpen && (
            <>
              <Button
                disabled={!canActivatePlayoff}
                size="sm"
                className="w-full text-xs"
              >
                Activate Playoff #1
              </Button>
              <p className="text-xs text-muted-foreground">
                Playoff format coming soon.
              </p>
            </>
          )}
        </section>

        <Separator />

        {/* Section D: Players Table */}
        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setPlayersOpen((o) => !o)}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Players
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground">
                  {members.length}
                </span>
                /<span className="font-bold">{league.maxPlayers}</span>
              </div>
              {playersOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {playersOpen && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6 px-2 text-xs">#</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="w-14 text-center text-xs px-2">
                      Active
                    </TableHead>
                    <TableHead className="w-8 px-1" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, idx) => (
                    <TableRow key={member.id}>
                      <TableCell className="text-muted-foreground text-xs px-2 py-2">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              "text-sm font-medium leading-tight",
                              member.disabled &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {member.userName}
                          </span>
                          <span className="text-xs text-neutral-500 leading-tight truncate max-w-[180px]">
                            {member.userEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-2 py-2">
                        <Switch
                          size="xs"
                          checked={!member.disabled}
                          onCheckedChange={() =>
                            leagueId &&
                            toggleDisabled.mutate({
                              leagueId,
                              memberId: member.id,
                            })
                          }
                          aria-label={`Toggle ${member.userName}`}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            leagueId &&
                            removeMember.mutate({
                              leagueId,
                              memberId: member.id,
                            })
                          }
                          aria-label={`Remove ${member.userName}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Add new player row */}
                  <TableRow>
                    <TableCell className="text-muted-foreground text-xs px-2 py-2">
                      {members.length + 1}
                    </TableCell>
                    <TableCell colSpan={3} className="py-2">
                      <div className="relative">
                        <Input
                          placeholder="Email address"
                          type="email"
                          maxLength={255}
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddPlayer()
                          }
                          className="h-8 text-sm pr-9"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-8 w-8"
                          onClick={handleAddPlayer}
                          disabled={!newEmail.trim() || addMember.isPending}
                          aria-label="Add player"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </section>
        <Separator />

        {/* Section E: Tables */}
        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setTablesOpen((o) => !o)}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Tables
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-muted-foreground">
                {leagueTablesList.data?.length ?? 0}
              </span>
              {tablesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {tablesOpen && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Id</TableHead>
                  <TableHead className="text-xs">Table Number</TableHead>
                  <TableHead className="w-16 px-1" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(leagueTablesList.data ?? []).map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-xs px-2 py-2 truncate max-w-[80px]">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="py-2">
                      {editingTableId === t.id ? (
                        <Input
                          type="number"
                          min={1}
                          value={editingTableNumber}
                          onChange={(e) =>
                            setEditingTableNumber(e.target.value)
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveTable()
                          }
                          className="h-8 text-sm w-20"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {t.tableNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-1 py-2">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            editingTableId === t.id
                              ? handleSaveTable()
                              : startEditTable(t)
                          }
                          aria-label={editingTableId === t.id ? "Save" : "Edit"}
                        >
                          {editingTableId === t.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Pencil className="h-3 w-3 text-neutral-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            leagueId &&
                            removeTable.mutate({ leagueId, tableId: t.id })
                          }
                          aria-label={`Remove table ${t.tableNumber}`}
                        >
                          <Trash2 className="h-3 w-3 text-neutral-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Add new table row */}
                <TableRow>
                  <TableCell className="text-muted-foreground text-xs px-2 py-2">
                    {(leagueTablesList.data?.length ?? 0) + 1}
                  </TableCell>
                  <TableCell colSpan={2} className="py-2">
                    <div className="flex justify-between items-center gap-2">
                      <Input
                        placeholder="Table Number"
                        type="number"
                        min={1}
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTable()}
                        className="h-8 text-sm pr-9 w-40"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddTable}
                        disabled={!newTableNumber.trim() || addTable.isPending}
                        aria-label="Add table"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </section>

        <Separator />

        {/* Publish */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Visibility
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">
                {league.isPublic ? "Public" : "Private"}
              </p>
              <p className="text-xs text-muted-foreground">
                {league.isPublic
                  ? "Anyone can find and sign up for this league."
                  : "Only people you invite can join this league."}
              </p>
            </div>
            <Switch
              checked={league.isPublic}
              onCheckedChange={(checked) =>
                updateSettings.mutate({
                  leagueId: league.id,
                  isPublic: checked,
                })
              }
              aria-label="Toggle league visibility"
            />
          </div>
        </section>

        <Separator />

        {/* Danger Zone */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">
            Danger Zone
          </h2>
          <div className="rounded-lg border border-destructive/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete this league</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete the league and all its data.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete League
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{league.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the league and all its data —
                      members, meetings, and match history. This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deleteLeague.mutate({ leagueId: league.id })
                      }
                      disabled={deleteLeague.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteLeague.isPending ? "Deleting..." : "Delete League"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </main>

      {/* Confirm complete meeting bottom sheet */}
      {confirmComplete !== null && (
        <div
          onClick={() => setConfirmComplete(null)}
          className="fixed inset-0 bg-black/80 flex items-end z-[100]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm sm:mx-auto bg-card border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8 space-y-4"
          >
            <div className="text-center text-lg font-extrabold">
              End Meeting?
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Are you sure you wish to end Meeting #
              {confirmComplete.meetingNumber}?
            </p>
            <Button
              onClick={() =>
                leagueId &&
                completeMeeting.mutate({
                  leagueId,
                  meetingId: confirmComplete.id,
                })
              }
              disabled={completeMeeting.isPending}
              className="w-full"
            >
              {completeMeeting.isPending ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                "Yes, end meeting"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setConfirmComplete(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
