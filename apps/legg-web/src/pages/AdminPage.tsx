import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLeagueContext, type ILeaguePlayer } from "@/contexts/LeagueContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const DatePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
}) => {
  const selected = value ? new Date(value) : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-44 justify-start text-left font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? format(selected, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => onChange(d ? d.toISOString() : undefined)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const AdminPage = () => {
  const { players, setPlayers, settings, setSettings } = useLeagueContext();
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");

  const [totalMeetings, _] = useState(10);

  const atMax = players.length >= settings.maxPlayers;

  const addPlayer = () => {
    const trimmed = newName.trim();
    if (!trimmed || atMax) return;
    const nextId =
      players.length > 0 ? Math.max(...players.map((p) => p.id)) + 1 : 1;
    setPlayers([
      ...players,
      {
        id: nextId,
        name: trimmed,
        wins: 0,
        losses: 0,
        pts: 0,
        disabled: false,
      },
    ]);
    setNewName("");
  };

  const toggleDisabled = (id: number) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, disabled: !p.disabled } : p)),
    );
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const activateMeeting = () => {
    if (settings.activatedMeetings < totalMeetings) {
      setSettings({
        ...settings,
        activatedMeetings: settings.activatedMeetings + 1,
      });
    }
    navigate(`/league/${leagueId}`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/league/${leagueId}`}>Lincoln Tel Aviv</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Admin</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
        <Separator variant="secondary" className="mt-4 bg-neutral-800" />
      </Breadcrumb>

      <h1 className="text-2xl font-bold text-foreground uppercase tracking-widest font-mono">
        Admin
      </h1>

      {/* Section A: League Schedule */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          League Schedule
        </h2>
        <div className="flex flex-wrap gap-6">
          <DatePicker
            label="Start Date"
            value={settings.startDate}
            onChange={(iso) => setSettings({ ...settings, startDate: iso })}
          />
          <div className="flex flex-col gap-1.5">
            <Label>Start Time</Label>
            <Input
              type="time"
              value={settings.startTime}
              onChange={(e) =>
                setSettings({ ...settings, startTime: e.target.value })
              }
              className="w-32"
            />
          </div>
          <DatePicker
            label="End Date"
            value={settings.endDate}
            onChange={(iso) => setSettings({ ...settings, endDate: iso })}
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Meetings per week</Label>
            <Input
              type="number"
              min={1}
              value={settings.meetingsPerWeek}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  meetingsPerWeek: Math.max(1, Number(e.target.value)),
                })
              }
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Max players</Label>
            <Input
              type="number"
              min={1}
              value={settings.maxPlayers}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxPlayers: Math.max(1, Number(e.target.value)),
                })
              }
              className="w-24"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Section B: Meeting Progress */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Round 1 Progress
        </h2>
        <p className="text-sm text-foreground">
          <span className="font-semibold text-primary">
            {settings.activatedMeetings}
          </span>
          {" / "}
          <span className="font-semibold">{totalMeetings}</span> meetings done
          <span className="text-muted-foreground"> (excluding playoffs)</span>
        </p>
        <Button
          onClick={activateMeeting}
          disabled={settings.activatedMeetings >= totalMeetings}
          size="sm"
          className="w-full font-mono text-xs"
        >
          Activate Meeting #{settings.activatedMeetings + 1}
        </Button>
      </section>

      <Separator />

      {/* Section C: Players Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest font-mono">
            Players
          </h2>
          <div className="flex items-center gap-1">
            <h3 className="text-2xl font-bold text-muted-foreground">
              {players.length}
            </h3>
            /<h4 className="font-bold">{settings.maxPlayers}</h4>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20 text-center">Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player: ILeaguePlayer, idx: number) => (
              <TableRow key={player.id}>
                <TableCell className="text-muted-foreground text-xs">
                  {idx + 1}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-medium",
                    player.disabled && "line-through text-muted-foreground",
                  )}
                >
                  {player.name}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    size="xs"
                    checked={!player.disabled}
                    onCheckedChange={() => toggleDisabled(player.id)}
                    aria-label={`Toggle ${player.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removePlayer(player.id)}
                    aria-label={`Remove ${player.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {/* Add new player row */}
            <TableRow>
              <TableCell className="text-muted-foreground text-xs">
                {players.length + 1}
              </TableCell>
              <TableCell colSpan={3}>
                <div className="relative">
                  <Input
                    placeholder="Name or email"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                    disabled={atMax}
                    className="h-8 text-sm pr-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8"
                    onClick={addPlayer}
                    disabled={atMax || !newName.trim()}
                    aria-label="Add player"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {atMax && (
          <p className="text-xs text-muted-foreground">
            Maximum number of players reached ({settings.maxPlayers}).
          </p>
        )}
      </section>
    </main>
  );
};
