import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TournamentDraft } from "@/pages/CreateTournamentPage";

interface Step3Props {
  data: Pick<
    TournamentDraft,
    | "registrationType"
    | "isFree"
    | "requireTeams"
    | "hasMaxParticipants"
    | "maxParticipants"
    | "startDate"
    | "isTentative"
    | "requireCheckIn"
    | "participants"
  >;
  onChange: (patch: Partial<TournamentDraft>) => void;
}

export const Step3Registration = ({ data, onChange }: Step3Props) => {
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");

  const addParticipant = () => {
    if (!newName.trim()) return;
    onChange({
      participants: [
        ...data.participants,
        { name: newName.trim(), teamName: newTeam.trim() || undefined },
      ],
    });
    setNewName("");
    setNewTeam("");
  };

  const removeParticipant = (index: number) => {
    onChange({ participants: data.participants.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      {/* Registration type */}
      <div className="space-y-3">
        <Label>Registration</Label>
        <RadioGroup
          value={data.registrationType}
          onValueChange={(v) => onChange({ registrationType: v as TournamentDraft["registrationType"] })}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="host_provided" id="reg-host" />
            <Label htmlFor="reg-host" className="cursor-pointer font-normal">
              I'll provide the participant list
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="sign_up_page" id="reg-signup" />
            <Label htmlFor="reg-signup" className="cursor-pointer font-normal">
              Shareable sign-up page (requires app login)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Registration fee */}
      <div className="flex items-center gap-3">
        <Switch
          id="isFree"
          checked={!data.isFree}
          onCheckedChange={(c) => onChange({ isFree: !c })}
        />
        <Label htmlFor="isFree" className="cursor-pointer font-normal">
          {data.isFree ? "Free entry" : "Paid entry"}
        </Label>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox
            id="requireTeams"
            checked={data.requireTeams}
            onCheckedChange={(c) => onChange({ requireTeams: !!c })}
          />
          <Label htmlFor="requireTeams" className="cursor-pointer font-normal">
            Require participants to register as a team
          </Label>
        </div>
        {data.requireTeams && (
          <p className="text-sm text-muted-foreground ml-7">
            Team captains will be responsible for registering and inviting team members.
          </p>
        )}
      </div>

      {/* Max participants */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="hasMax"
            checked={data.hasMaxParticipants}
            onCheckedChange={(c) => onChange({ hasMaxParticipants: !!c, maxParticipants: undefined })}
          />
          <Label htmlFor="hasMax" className="cursor-pointer font-normal">
            Specify a maximum number of participants
          </Label>
        </div>
        {data.hasMaxParticipants && (
          <Input
            type="number"
            min={2}
            placeholder="e.g. 16"
            value={data.maxParticipants ?? ""}
            onChange={(e) =>
              onChange({ maxParticipants: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-32"
          />
        )}
      </div>

      {/* Participant list (host_provided only) */}
      {data.registrationType === "host_provided" && (
        <div className="space-y-3">
          <Label>Participants</Label>
          <div className="flex gap-2">
            <Input
              placeholder={data.requireTeams ? "Team name" : "Player name"}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            {data.requireTeams && (
              <Input
                placeholder="Team tag (optional)"
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                className="w-36"
              />
            )}
            <Button type="button" variant="outline" onClick={addParticipant}>
              +
            </Button>
          </div>
          {data.participants.length > 0 && (
            <ul className="space-y-1">
              {data.participants.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {p.name}
                    {p.teamName && <span className="ml-2 text-muted-foreground">({p.teamName})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Date & time */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Date &amp; start time</Label>
        <Input
          id="startDate"
          type="datetime-local"
          value={data.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
        />
      </div>

      {/* Tentative / Check-in */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="isTentative"
            checked={data.isTentative}
            onCheckedChange={(c) => onChange({ isTentative: !!c })}
          />
          <Label htmlFor="isTentative" className="cursor-pointer font-normal">
            Mark as tentative
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="requireCheckIn"
            checked={data.requireCheckIn}
            onCheckedChange={(c) => onChange({ requireCheckIn: !!c })}
          />
          <Label htmlFor="requireCheckIn" className="cursor-pointer font-normal">
            Require participants to check in
          </Label>
        </div>
      </div>
    </div>
  );
};
