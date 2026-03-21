import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const AdminTablesSection = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const {
    leagueTablesList,
    newTableNumber,
    setNewTableNumber,
    editingTableId,
    editingTableNumber,
    setEditingTableNumber,
    addTable,
    removeTable,
    startEditTable,
    handleSaveTable,
    handleAddTable,
  } = useAdminContext();

  const [open, setOpen] = useState(true);

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Tables
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-muted-foreground">
            {leagueTablesList.data?.length ?? 0}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {(leagueTablesList.data ?? []).map((t, idx) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2 border-b border-muted"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-muted-foreground w-5 shrink-0">
                  {idx + 1}
                </span>
                {editingTableId === t.id ? (
                  <Input
                    type="number"
                    min={1}
                    value={editingTableNumber}
                    onChange={(e) => setEditingTableNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTable()}
                    className="h-7 text-sm w-20"
                  />
                ) : (
                  <span className="text-sm font-medium">{t.tableNumber}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    editingTableId === t.id ? handleSaveTable() : startEditTable(t)
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
                    leagueId && removeTable.mutate({ leagueId, tableId: t.id })
                  }
                  aria-label={`Remove table ${t.tableNumber}`}
                >
                  <Trash2 className="h-3 w-3 text-neutral-500" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[11px] text-muted-foreground w-5 shrink-0">
              {(leagueTablesList.data?.length ?? 0) + 1}
            </span>
            <Input
              placeholder="Table Number"
              value={newTableNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setNewTableNumber(val ? String(Number(val)) : "");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddTable()}
              className="h-7 text-sm flex-1"
            />
            <Button
              size="xs"
              onClick={handleAddTable}
              disabled={!newTableNumber.trim() || addTable.isPending}
              aria-label="Add table"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
