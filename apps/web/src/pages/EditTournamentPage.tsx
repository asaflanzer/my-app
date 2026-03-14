import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Step1BasicInfo } from "@/components/create-tournament/Step1BasicInfo";
import { Step2Format } from "@/components/create-tournament/Step2Format";
import { Step3Registration } from "@/components/create-tournament/Step3Registration";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import type { TournamentDraft } from "@/pages/CreateTournamentPage";

const STEP_TITLES = ["Basic Info", "Format", "Registration"];

export const EditTournamentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TournamentDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = trpc.tournament.getById.useQuery(
    { id: id! },
    { enabled: !!id && !!session }
  );

  // Pre-fill draft once data loads
  useEffect(() => {
    if (!data) return;
    const { tournament, participants } = data;
    setDraft({
      name: tournament.name,
      gameType: tournament.gameType,
      duration: tournament.duration as TournamentDraft["duration"],
      format: tournament.format as TournamentDraft["format"],
      hasSecondFormat: !!tournament.secondFormat,
      secondFormat: tournament.secondFormat as TournamentDraft["secondFormat"] ?? undefined,
      breakTies: tournament.breakTies,
      registrationType: tournament.registrationType as TournamentDraft["registrationType"],
      isFree: tournament.isFree,
      requireTeams: tournament.requireTeams,
      hasMaxParticipants: tournament.maxParticipants != null,
      maxParticipants: tournament.maxParticipants ?? undefined,
      startDate: new Date(tournament.startDate).toISOString().slice(0, 16), // datetime-local format
      isTentative: tournament.isTentative,
      requireCheckIn: tournament.requireCheckIn,
      participants: participants.map((p) => ({
        name: p.name,
        teamName: p.teamName ?? undefined,
      })),
    });
  }, [data]);

  const patch = (p: Partial<TournamentDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const updateMutation = trpc.tournament.update.useMutation({
    onSuccess: ({ id: tid }) => navigate(`/tournament/${tid}`),
    onError: (e) => setError(e.message),
  });

  if (sessionPending || isLoading || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (data && data.tournament.hostId !== session.user.id) {
    return <Navigate to={`/tournament/${id}`} replace />;
  }

  const canAdvance = () => {
    if (step === 0) return draft.name.trim().length > 0 && draft.gameType.trim().length > 0;
    if (step === 1) return !!draft.format;
    if (step === 2) return draft.startDate.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      setError(null);
      updateMutation.mutate({
        id: id!,
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
          onClick={() => navigate(`/tournament/${id}`)}
          className="text-xl font-bold hover:opacity-80"
        >
          Game On
        </button>
        <span className="text-sm text-muted-foreground">
          Edit — Step {step + 1} of 3 · {STEP_TITLES[step]}
        </span>
      </header>

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
              onClick={() =>
                step === 0 ? navigate(`/tournament/${id}`) : setStep((s) => s - 1)
              }
              disabled={updateMutation.isPending}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canAdvance() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : step === 2 ? "Save Changes" : "Next"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};
