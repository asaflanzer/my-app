import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { formatScore, sortStandings } from "@/lib/standings.utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const AdminPlayersSection = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { league, players } = useLeagueContext();
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

  const { isLoading } = useAppContext();
  const [open, setOpen] = useState(true);

  if (!league) return null;

  const { members } = league;
  const memberEmailMap = new Map(members.map((m) => [m.id, m.userEmail]));
  const sortedPlayers = sortStandings(players);

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
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[20px_1fr_auto] px-3 py-[7px] border-b border-muted text-[10px] text-muted-foreground uppercase tracking-[.8px]">
            <span>#</span>
            <span>Player</span>
            <div className="flex items-center gap-3">
              <span className="w-8 text-center">Active</span>
              <span className="w-12 text-center">Qual.</span>
              <span className="w-7" />
            </div>
          </div>

          {/* Member rows */}
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="grid grid-cols-[20px_1fr_auto] px-3 py-2.5 border-b border-muted last:border-b-0 items-start"
            >
              <span className="text-[11px] text-muted-foreground pt-0.5">
                {idx + 1}
              </span>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium leading-tight">
                      {player.name}
                    </span>
                    {player.disabled && (
                      <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-medium leading-none">
                        Inactive
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 leading-tight truncate">
                    {memberEmailMap.get(player.id)}
                  </span>
                </div>
                {/* Stats */}
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[11px]">
                    <span className="text-muted-foreground">W </span>
                    <span className="text-emerald-500 font-semibold">
                      {player.wins}
                    </span>
                  </span>
                  <span className="text-[11px]">
                    <span className="text-muted-foreground">L </span>
                    <span className="text-red-400 font-semibold">
                      {player.losses}
                    </span>
                  </span>
                  <span className="text-[11px]">
                    <span className="text-muted-foreground">G </span>
                    <span className="font-semibold">{player.games}</span>
                  </span>
                  <span className="text-[11px]">
                    <span className="text-muted-foreground">Pts </span>
                    <span className="text-secondary font-extrabold">
                      {formatScore(player.score)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  <Switch
                    size="xs"
                    checked={!player.disabled}
                    disabled={isLoading}
                    onCheckedChange={() =>
                      leagueId &&
                      toggleDisabled.mutate({
                        leagueId,
                        memberId: player.id,
                      })
                    }
                    aria-label={`Toggle active ${player.name}`}
                  />
                </div>
                <div className="w-12 flex justify-center">
                  <Switch
                    size="xs"
                    checked={player.isQualified}
                    disabled={isLoading}
                    onCheckedChange={() =>
                      leagueId &&
                      toggleQualified.mutate({
                        leagueId,
                        memberId: player.id,
                      })
                    }
                    aria-label={`Toggle qualified ${player.name}`}
                  />
                </div>
                <div className="w-7 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      leagueId &&
                      removeMember.mutate({
                        leagueId,
                        memberId: player.id,
                      })
                    }
                    aria-label={`Remove ${player.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add player row */}
          <div className="grid grid-cols-[20px_1fr] px-3 py-2.5">
            <span className="text-[11px] text-muted-foreground pt-2">
              {members.length + 1}
            </span>
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
          </div>
        </div>
      )}
    </section>
  );
};
