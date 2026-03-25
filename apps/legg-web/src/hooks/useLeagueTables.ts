import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/contexts/AppContext";

export function useLeagueTables() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [newTableNumber, setNewTableNumber] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableNumber, setEditingTableNumber] = useState("");
  const { incrementLoading, decrementLoading } = useAppContext();

  const utils = trpc.useUtils();

  const leagueTablesList = trpc.league.listTables.useQuery(
    { leagueId: leagueId! },
    { enabled: !!leagueId },
  );

  const initializeTables = trpc.league.initializeTables.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => void utils.league.listTables.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const addTable = trpc.league.addTable.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.league.listTables.invalidate();
      setNewTableNumber("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTable = trpc.league.updateTable.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => {
      void utils.league.listTables.invalidate();
      setEditingTableId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeTable = trpc.league.removeTable.useMutation({
    onMutate: () => incrementLoading(),
    onSettled: () => decrementLoading(),
    onSuccess: () => void utils.league.listTables.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const startEditTable = (table: { id: string; tableNumber: number }) => {
    setEditingTableId(table.id);
    setEditingTableNumber(String(table.tableNumber));
  };

  const handleSaveTable = () => {
    const num = parseInt(editingTableNumber, 10);
    if (!editingTableId || isNaN(num) || num < 1 || !leagueId) return;
    updateTable.mutate({ leagueId, tableId: editingTableId, tableNumber: num });
  };

  const handleAddTable = () => {
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num < 1 || !leagueId) return;
    addTable.mutate({ leagueId, tableNumber: num });
  };

  return {
    leagueTablesList,
    initializeTables,
    newTableNumber,
    setNewTableNumber,
    editingTableId,
    editingTableNumber,
    setEditingTableNumber,
    addTable,
    updateTable,
    removeTable,
    startEditTable,
    handleSaveTable,
    handleAddTable,
  };
}
