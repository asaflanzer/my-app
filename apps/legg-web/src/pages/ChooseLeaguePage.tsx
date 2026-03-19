import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { AppHeader } from "@/components/AppHeader";
import { useChooseLeague } from "@/hooks/useChooseLeague";
import { MyLeaguesList } from "@/components/league/MyLeaguesList";
import { JoinLeagueSection } from "@/components/league/JoinLeagueSection";
import { ContactSection } from "@/components/league/ContactSection";
import { CreateLeagueForm } from "@/components/league/CreateLeagueForm";

export const ChooseLeaguePage = () => {
  const { data: session, isPending } = useSession();
  const {
    leagues,
    leaguesLoading,
    availableLeagues,
    availableLoading,
    canCreateLeague,
    createLeague,
    signUp,
    sendContact,
  } = useChooseLeague();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1 flex-col items-center px-4 pt-8 gap-8">
        <MyLeaguesList leagues={leagues ?? []} isLoading={leaguesLoading} />

        {!availableLoading && availableLeagues && (
          <JoinLeagueSection
            availableLeagues={availableLeagues}
            onSignUp={(leagueId) => signUp.mutate({ leagueId })}
            isPending={signUp.isPending}
          />
        )}

        <div className="w-full max-w-sm space-y-3 px-8 pb-8 mt-auto">
          {!canCreateLeague && (
            <ContactSection
              onSend={(message) => sendContact.mutate({ message })}
              isSending={sendContact.isPending}
            />
          )}

          {canCreateLeague && (
            <CreateLeagueForm
              onCreate={(args) => createLeague.mutate(args)}
              isPending={createLeague.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
};
