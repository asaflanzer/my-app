import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { RouterOutputs } from "@my-app/api";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/contexts/AppContext";

type LeagueData = RouterOutputs["league"]["getById"];

type MeetingSlotData = {
  id: string;
  scheduledDate: string | null;
  createdAt: string;
  status: string;
  meetingNumber: number;
};

export function useLeagueMeetings(league: LeagueData | undefined) {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { incrementLoading, decrementLoading } = useAppContext();

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

  const meetingList = trpc.meeting.list.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  const initializeMeetings = trpc.meeting.initialize.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast.success("Schedule saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  const activateMeeting = trpc.meeting.activate.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast.success("Meeting activated", {
        duration: 5000,
        action: {
          label: "View meeting",
          onClick: () => navigate(`/league/${leagueId}`),
        },
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const pauseMeeting = trpc.meeting.togglePause.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => void utils.meeting.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const completeMeeting = trpc.meeting.complete.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      setConfirmComplete(null);
      toast.success("Meeting completed!");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMeetings = trpc.meeting.reset.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.meeting.list.invalidate();
      toast("Meetings reset!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMeetingDate = trpc.meeting.updateDate.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => void utils.meeting.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const regularMeetingsList = useMemo(
    () => (meetingList.data ?? []).filter((m) => m.status !== "playoff"),
    [meetingList.data],
  );

  const activatedMeetings = regularMeetingsList.length;

  const activatedPlayoffs = useMemo(
    () => (meetingList.data ?? []).filter((m) => m.status === "playoff").length,
    [meetingList.data],
  );

  const canStartMeeting = !!league?.startDate && !!league?.maxPlayers;

  const allMeetingSlots = useMemo(
    () =>
      Array.from({ length: league?.regularMeetings ?? 0 }, (_, i) => {
        const num = i + 1;
        const data =
          meetingList.data?.find((m) => m.meetingNumber === num) ?? null;
        return { meetingNumber: num, data };
      }),
    [league?.regularMeetings, meetingList.data],
  );

  const currentSlotIndex = useMemo(
    () => allMeetingSlots.findIndex((s) => !s.data || s.data.status !== "done"),
    [allMeetingSlots],
  );

  const lastRegularMeeting =
    regularMeetingsList[regularMeetingsList.length - 1];

  const allRegularMeetingsDone =
    activatedMeetings >= (league?.regularMeetings ?? Infinity) &&
    !!lastRegularMeeting &&
    lastRegularMeeting.status === "done";

  const canActivatePlayoff = allRegularMeetingsDone && activatedPlayoffs === 0;

  const startEditDate = (
    slot: { meetingNumber: number },
    meeting: Pick<MeetingSlotData, "id" | "scheduledDate" | "createdAt"> | null,
  ) => {
    const editingId = meeting?.id ?? `slot-${slot.meetingNumber}`;
    const dateStr = meeting?.scheduledDate
      ? format(new Date(meeting.scheduledDate), "yyyy-MM-dd")
      : (pendingDates.get(slot.meetingNumber) ??
        (league?.startDate
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
    meeting: Pick<MeetingSlotData, "id"> | null,
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

  return {
    meetingList,
    initializeMeetings,
    activateMeeting,
    pauseMeeting,
    completeMeeting,
    resetMeetings,
    updateMeetingDate,
    confirmComplete,
    setConfirmComplete,
    editingDateMeetingId,
    setEditingDateMeetingId,
    editingDateValue,
    setEditingDateValue,
    pendingDates,
    regularMeetingsList,
    activatedMeetings,
    activatedPlayoffs,
    canStartMeeting,
    allMeetingSlots,
    currentSlotIndex,
    lastRegularMeeting,
    allRegularMeetingsDone,
    canActivatePlayoff,
    startEditDate,
    handleSaveDate,
  };
}
