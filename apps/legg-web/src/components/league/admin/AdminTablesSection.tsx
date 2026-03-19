import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
                      onChange={(e) => setEditingTableNumber(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveTable()
                      }
                      className="h-8 text-sm w-20"
                    />
                  ) : (
                    <span className="text-sm font-medium">{t.tableNumber}</span>
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
  );
};
