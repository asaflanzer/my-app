import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function useLeagueSettings() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const updateSettings = trpc.league.updateSettings.useMutation({
    onSuccess: () => {
      void utils.league.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteLeague = trpc.league.delete.useMutation({
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
