import { useLeagueContext } from "@/contexts/LeagueContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { Separator } from "@/components/ui/separator";
import { AdminBreadcrumb } from "@/components/league/admin/AdminBreadcrumb";
import { AdminScheduleSection } from "@/components/league/admin/AdminScheduleSection";
import { AdminMeetingsSection } from "@/components/league/admin/AdminMeetingsSection";
import { AdminPlayoffsSection } from "@/components/league/admin/AdminPlayoffsSection";
import { AdminPlayersSection } from "@/components/league/admin/AdminPlayersSection";
import { AdminTablesSection } from "@/components/league/admin/AdminTablesSection";
import { AdminVisibilitySection } from "@/components/league/admin/AdminVisibilitySection";
import { AdminDangerZone } from "@/components/league/admin/AdminDangerZone";
import { MeetingCompleteModal } from "@/components/league/admin/MeetingCompleteModal";

const AdminPageContent = () => {
  const { isLoading, league } = useLeagueContext();

  if (isLoading || !league) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <AdminBreadcrumb />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-widest">
          Admin
        </h1>
        <AdminScheduleSection />
        <Separator />
        <AdminMeetingsSection />
        <Separator />
        <AdminPlayoffsSection />
        <Separator />
        <AdminPlayersSection />
        <Separator />
        <AdminTablesSection />
        <Separator />
        <AdminVisibilitySection />
        <Separator />
        <AdminDangerZone />
      </main>
      <MeetingCompleteModal />
    </>
  );
};

export const LeagueHostPage = () => (
  <AdminProvider>
    <AdminPageContent />
  </AdminProvider>
);
