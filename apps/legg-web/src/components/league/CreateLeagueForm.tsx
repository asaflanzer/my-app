import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ICreateLeagueFormProps {
  onCreate: (args: { name: string; slug: string; isPublic: boolean }) => void;
  isPending: boolean;
}

export const CreateLeagueForm = ({ onCreate, isPending }: ICreateLeagueFormProps) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = () => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    onCreate({ name, slug, isPublic });
  };

  if (!showForm) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowForm(true)}
        className="gap-2 w-full"
      >
        <Plus className="h-4 w-4" /> Host a League
      </Button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4 bg-card border border-card-border rounded-xl p-5">
      <h2 className="font-bold text-sm uppercase tracking-widest">
        New League
      </h2>
      <div className="space-y-1.5">
        <Label>League Name</Label>
        <Input
          placeholder="e.g. Lincoln TLV"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">Publish</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={isPublic}
            onCheckedChange={setIsPublic}
            aria-label="Public league"
          />
          <span className="text-xs text-muted-foreground">
            {isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>
      {!isPublic && (
        <p className="text-xs text-muted-foreground">
          You can publish it later via the admin page.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || isPending}
          className="flex-1"
        >
          {isPending ? "Creating…" : "Create"}
        </Button>
        <Button variant="ghost" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
