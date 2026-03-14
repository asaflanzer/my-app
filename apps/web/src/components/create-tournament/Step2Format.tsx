import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { TournamentDraft, TournamentFormat } from "@/pages/CreateTournamentPage";

interface Step2Props {
  data: Pick<TournamentDraft, "duration" | "format" | "hasSecondFormat" | "secondFormat" | "breakTies">;
  onChange: (patch: Partial<TournamentDraft>) => void;
}

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; description: string }[] = [
  { value: "single_elimination", label: "Single Elimination", description: "Lose once, you're out." },
  { value: "double_elimination", label: "Double Elimination", description: "Two losses before elimination." },
  { value: "round_robin", label: "Round Robin", description: "Everyone plays everyone." },
  { value: "swiss", label: "Swiss", description: "Paired by record each round." },
  { value: "free_for_all", label: "Free for All", description: "All participants in one bracket." },
  { value: "leaderboard", label: "Leaderboard", description: "Points-based standings, no head-to-head bracket." },
];

export const Step2Format = ({ data, onChange }: Step2Props) => (
  <div className="space-y-8">
    {/* Duration */}
    <div className="space-y-3">
      <Label>Duration</Label>
      <RadioGroup
        value={data.duration}
        onValueChange={(v) => onChange({ duration: v as TournamentDraft["duration"] })}
        className="flex flex-col gap-2"
      >
        {(["single_day", "multi_day", "recurring"] as const).map((d) => (
          <div key={d} className="flex items-center gap-3">
            <RadioGroupItem value={d} id={`dur-${d}`} />
            <Label htmlFor={`dur-${d}`} className="cursor-pointer font-normal capitalize">
              {d.replace("_", " ")}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>

    {/* Primary format */}
    <div className="space-y-2">
      <Label>Format</Label>
      <Select value={data.format} onValueChange={(v) => onChange({ format: v as TournamentFormat })}>
        <SelectTrigger>
          <SelectValue placeholder="Select format" />
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              <span className="font-medium">{f.label}</span>
              <span className="ml-2 text-muted-foreground text-sm">{f.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Second format */}
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="secondFormat"
          checked={data.hasSecondFormat}
          onCheckedChange={(c) => onChange({ hasSecondFormat: !!c, secondFormat: undefined })}
        />
        <Label htmlFor="secondFormat" className="cursor-pointer font-normal">
          Use a second format (e.g. different format for later rounds)
        </Label>
      </div>
      {data.hasSecondFormat && (
        <Select
          value={data.secondFormat ?? ""}
          onValueChange={(v) => onChange({ secondFormat: v as TournamentFormat })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select second format" />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.filter((f) => f.value !== data.format).map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>

    {/* Break ties */}
    <div className="flex items-center gap-3">
      <Checkbox
        id="breakTies"
        checked={data.breakTies}
        onCheckedChange={(c) => onChange({ breakTies: !!c })}
      />
      <Label htmlFor="breakTies" className="cursor-pointer font-normal">
        Break ties with placement matches
      </Label>
    </div>
  </div>
);
