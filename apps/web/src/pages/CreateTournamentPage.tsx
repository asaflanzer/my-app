import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Step1BasicInfo } from "@/components/create-tournament/Step1BasicInfo";
import { Step2Format } from "@/components/create-tournament/Step2Format";
import { Step3Registration } from "@/components/create-tournament/Step3Registration";
import { trpc } from "@/lib/trpc";

export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "swiss"
  | "free_for_all"
  | "leaderboard";

export interface TournamentDraft {
  // Step 1
  name: string;
  gameType: string;
  // Step 2
  duration: "single_day" | "multi_day" | "recurring";
  format: TournamentFormat;
  hasSecondFormat: boolean;
  secondFormat?: TournamentFormat | undefined;
  breakTies: boolean;
  // Step 3
  registrationType: "host_provided" | "sign_up_page";
  isFree: boolean;
  requireTeams: boolean;
  hasMaxParticipants: boolean;
  maxParticipants?: number | undefined;
  startDate: string;
  isTentative: boolean;
  requireCheckIn: boolean;
  participants: Array<{ name: string; teamName?: string | undefined }>;
}

const INITIAL: TournamentDraft = {
  name: "",
  gameType: "",
  duration: "single_day",
  format: "single_elimination",
  hasSecondFormat: false,
  secondFormat: undefined,
  breakTies: false,
  registrationType: "host_provided",
  isFree: true,
  requireTeams: false,
  hasMaxParticipants: false,
  maxParticipants: undefined,
  startDate: "",
  isTentative: false,
  requireCheckIn: false,
  participants: [],
};

const STEP_TITLES = ["Basic Info", "Format", "Registration"];

export const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TournamentDraft>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<TournamentDraft>) => setDraft((d) => ({ ...d, ...p }));

  const canAdvance = () => {
    if (step === 0) return draft.name.trim().length > 0 && draft.gameType.trim().length > 0;
    if (step === 1) return !!draft.format;
    if (step === 2) return draft.startDate.length > 0;
    return false;
  };

  const createMutation = trpc.tournament.create.useMutation({
    onSuccess: ({ id }) => navigate(`/tournament/${id}`),
    onError: (e) => setError(e.message),
  });

  const handleNext = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      setError(null);
      createMutation.mutate({
        name: draft.name,
        gameType: draft.gameType,
        duration: draft.duration,
        format: draft.format,
        secondFormat: draft.hasSecondFormat ? draft.secondFormat : undefined,
        breakTies: draft.breakTies,
        registrationType: draft.registrationType,
        isFree: draft.isFree,
        requireTeams: draft.requireTeams,
        maxParticipants: draft.hasMaxParticipants ? draft.maxParticipants : undefined,
        startDate: new Date(draft.startDate).toISOString(),
        isTentative: draft.isTentative,
        requireCheckIn: draft.requireCheckIn,
        participants: draft.participants,
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-8 py-4 border-b">
        <button
          onClick={() => navigate("/")}
          className="text-xl font-bold hover:opacity-80"
        >
          Game On
        </button>
        <span className="text-sm text-muted-foreground">
          Step {step + 1} of 3 — {STEP_TITLES[step]}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-1 bg-primary transition-all"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>

      <main className="flex flex-1 items-start justify-center p-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{STEP_TITLES[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && <Step1BasicInfo data={draft} onChange={patch} />}
            {step === 1 && <Step2Format data={draft} onChange={patch} />}
            {step === 2 && <Step3Registration data={draft} onChange={patch} />}
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? navigate("/") : setStep((s) => s - 1))}
              disabled={createMutation.isPending}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canAdvance() || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Creating…"
                : step === 2
                ? "Save and Create"
                : "Next"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};
