import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useChooseLeague() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!session });

  const { data: leagues, isLoading: leaguesLoading } =
    trpc.league.list.useQuery(undefined, { enabled: !!session });

  const { data: availableLeagues, isLoading: availableLoading } =
    trpc.league.listAvailable.useQuery(undefined, { enabled: !!session });

  const createLeague = trpc.league.create.useMutation({
    onSuccess: (data) => {
      toast("League created!");
      navigate(`/league/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const signUp = trpc.league.signUp.useMutation({
    onSuccess: () => {
      toast("Signed up! Waiting for host approval.");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendContact = trpc.contact.send.useMutation({
    onSuccess: () => {
      toast("Message sent!");
    },
    onError: (e) => toast.error(e.message),
  });

  return {
    navigate,
    leagues,
    leaguesLoading,
    availableLeagues,
    availableLoading,
    canCreateLeague: me?.isAdmin ?? false,
    createLeague,
    signUp,
    sendContact,
  };
}
