import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/contexts/AppContext";

export function useLeagueSettings() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { incrementLoading, decrementLoading } = useAppContext();

  const updateSettings = trpc.league.updateSettings.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.league.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteLeague = trpc.league.delete.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      toast("League deleted.");
      navigate("/leagues");
    },
    onError: (e) => toast.error(e.message),
  });

  return {
    updateSettings,
    deleteLeague,
  };
}
