import { Loader } from "lucide-react";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/league/admin/DatePicker";

export const AdminScheduleSection = () => {
  const { league } = useLeagueContext();
  const { updateSettings, initializeMeetings, meetingList } = useAdminContext();

  if (!league) return null;

  const hasAnyMeeting = (meetingList.data?.length ?? 0) > 0;
  const hasStarted =
    meetingList.data?.some((m) => m.status !== "inactive") ?? false;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        League Schedule
      </h2>
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <DatePicker
          label="Start Date"
          value={league.startDate}
          onChange={(iso) =>
            updateSettings.mutate({ leagueId: league.id, startDate: iso })
          }
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Start Time
          </Label>
          <Input
            type="time"
            value={league.startTime}
            onChange={(e) =>
              updateSettings.mutate({
                leagueId: league.id,
                startTime: e.target.value,
              })
            }
            className="w-30 h-9.5 py-0 [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Meetings
          </Label>
          <Input
            type="number"
            min={1}
            defaultValue={league.regularMeetings}
            onBlur={(e) =>
              updateSettings.mutate({
                leagueId: league.id,
                regularMeetings: Math.max(1, Number(e.target.value)),
              })
            }
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Playoff
          </Label>
          <Input
            type="number"
            min={1}
            defaultValue={league.playoffMeetings}
            onBlur={(e) =>
              updateSettings.mutate({
                leagueId: league.id,
                playoffMeetings: Math.max(1, Number(e.target.value)),
              })
            }
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Max players
          </Label>
          <Input
            type="number"
            min={1}
            defaultValue={league.maxPlayers}
            onBlur={(e) =>
              updateSettings.mutate({
                leagueId: league.id,
                maxPlayers: Math.max(1, Number(e.target.value)),
              })
            }
            className="w-full"
          />
        </div>
      </div>
      {!hasStarted && (
        <div>
          <Button
            onClick={() =>
              league.id && initializeMeetings.mutate({ leagueId: league.id })
            }
            disabled={initializeMeetings.isPending || !league.startDate}
          >
            {initializeMeetings.isPending && (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            )}
            {hasAnyMeeting ? "Update" : "Continue"}
          </Button>
        </div>
      )}
    </section>
  );
};
