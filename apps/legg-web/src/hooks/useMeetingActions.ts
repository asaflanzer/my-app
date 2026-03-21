import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { RouterOutputs } from "@my-app/api";
import { trpc } from "@/lib/trpc";

type ActiveMeetingData = RouterOutputs["meeting"]["getActive"];

interface IUseMeetingActionsOptions {
  activeMeeting: ActiveMeetingData | undefined;
  raceTo: number;
  onScoreSubmitted?: () => void;
  onTakeBreak?: () => void;
  onShufflePlayer?: () => void;
}

export function useMeetingActions({
  activeMeeting,
  raceTo,
  onScoreSubmitted,
  onTakeBreak,
  onShufflePlayer,
}: IUseMeetingActionsOptions) {
  const navigate = useNavigate();
  const { leagueId } = useParams<{ leagueId: string }>();
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
    onSuccess: () => void utils.meeting.getActive.invalidate({ leagueId: leagueId ?? "" }),
  });

  const submitScore = trpc.meeting.submitScore.useMutation({
    onSuccess: () => {
      invalidate();
      onScoreSubmitted?.();
      toast("Score submitted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const takeBreak = trpc.meeting.takeBreak.useMutation({
    onSuccess: () => {
      invalidate();
      onTakeBreak?.();
      toast("Taking a break — see you soon!");
    },
    onError: (e) => toast.error(e.message),
  });

  const shufflePlayer = trpc.meeting.shufflePlayer.useMutation({
    onSuccess: () => {
      invalidate();
      onShufflePlayer?.();
      toast("Swapped in — enjoy your break!");
    },
    onError: (e) => toast.error(e.message),
  });

  const leaveLeague = trpc.league.leave.useMutation({
    onSuccess: () => {
      toast("You've left this league.");
      navigate("/leagues");
    },
    onError: (e) => toast.error(e.message),
  });

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

  const handleSubmitScore = (tableId: string, score1: number, score2: number) => {
    if (!activeMeeting || !leagueId) return;
    submitScore.mutate({ tableId, meetingId: activeMeeting.id, leagueId, raceTo, score1, score2 });
  };

  const handleTakeBreak = () => {
    if (!activeMeeting || !leagueId) return;
    takeBreak.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  const handleShufflePlayer = () => {
    if (!activeMeeting || !leagueId) return;
    shufflePlayer.mutate({ leagueId, meetingId: activeMeeting.id });
  };

  const handleLeaveLeague = () => {
    if (!leagueId) return;
    leaveLeague.mutate({ leagueId });
  };

  return {
    toggleReady,
    draw,
    updateScore,
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
    invalidate,
  };
}
