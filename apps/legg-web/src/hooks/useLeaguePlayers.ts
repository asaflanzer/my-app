import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/contexts/AppContext";

export function useLeaguePlayers(refetch: () => void) {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const { incrementLoading, decrementLoading } = useAppContext();

  const addMember = trpc.league.addMember.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      refetch();
      setNewName("");
      setNewEmail("");
      toast("Player added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = trpc.league.removeMember.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const toggleDisabled = trpc.league.toggleDisabled.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const toggleQualified = trpc.league.toggleQualified.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const handleAddPlayer = () => {
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();
    if (!trimmedName || !trimmedEmail || !leagueId) return;
    addMember.mutate({ leagueId, name: trimmedName, email: trimmedEmail });
  };

  return {
    newName,
    setNewName,
    newEmail,
    setNewEmail,
    addMember,
    removeMember,
    toggleDisabled,
    toggleQualified,
    handleAddPlayer,
  };
}
