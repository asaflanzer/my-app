import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AdminPlayersSection = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { league } = useLeagueContext();
  const {
    newName,
    setNewName,
    newEmail,
    setNewEmail,
    addMember,
    removeMember,
    toggleDisabled,
    toggleQualified,
    handleAddPlayer,
  } = useAdminContext();

  const [open, setOpen] = useState(true);

  if (!league) return null;

  const { members } = league;

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((o) => !o)}
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
              <TableHead className="w-6 px-2 text-xs">#</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="w-14 text-center text-xs px-2">
                Active
              </TableHead>
              <TableHead className="w-16 text-center text-xs px-2">
                Qualified
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
                        member.disabled && "line-through text-muted-foreground",
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
                    aria-label={`Toggle active ${member.userName}`}
                  />
                </TableCell>
                <TableCell className="text-center px-2 py-2">
                  <Switch
                    size="xs"
                    checked={member.isQualified}
                    onCheckedChange={() =>
                      leagueId &&
                      toggleQualified.mutate({
                        leagueId,
                        memberId: member.id,
                      })
                    }
                    aria-label={`Toggle qualified ${member.userName}`}
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
            <TableRow>
              <TableCell className="text-muted-foreground text-xs px-2 py-2">
                {members.length + 1}
              </TableCell>
              <TableCell colSpan={3} className="py-2">
                <div className="flex flex-col gap-1.5">
                  <Input
                    placeholder="Full name"
                    type="text"
                    maxLength={100}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="relative">
                    <Input
                      placeholder="Gmail address"
                      type="email"
                      maxLength={255}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                      className="h-8 text-sm pr-9"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-8 w-8"
                      onClick={handleAddPlayer}
                      disabled={
                        !newName.trim() ||
                        !newEmail.trim() ||
                        !newEmail.toLowerCase().endsWith("@gmail.com") ||
                        addMember.isPending
                      }
                      aria-label="Add player"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </section>
  );
};
