import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TournamentDraft } from "@/pages/CreateTournamentPage";

interface Step1Props {
  data: Pick<TournamentDraft, "name" | "gameType">;
  onChange: (patch: Partial<TournamentDraft>) => void;
}

export const Step1BasicInfo = ({ data, onChange }: Step1Props) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="name">Tournament name</Label>
      <Input
        id="name"
        placeholder="e.g. Summer Smash 2025"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="gameType">Game / Sport</Label>
      <Input
        id="gameType"
        placeholder="e.g. Chess, FIFA, Basketball"
        value={data.gameType}
        onChange={(e) => onChange({ gameType: e.target.value })}
      />
    </div>
  </div>
);
