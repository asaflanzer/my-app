import { createContext, useContext, type ReactNode } from "react";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { useLeagueMeetings } from "@/hooks/useLeagueMeetings";
import { useLeaguePlayers } from "@/hooks/useLeaguePlayers";
import { useLeagueTables } from "@/hooks/useLeagueTables";
import { useLeagueSettings } from "@/hooks/useLeagueSettings";

type MeetingsState = ReturnType<typeof useLeagueMeetings>;
type PlayersState = ReturnType<typeof useLeaguePlayers>;
type TablesState = ReturnType<typeof useLeagueTables>;
type SettingsState = ReturnType<typeof useLeagueSettings>;

interface IAdminContext
  extends MeetingsState,
    PlayersState,
    TablesState,
    SettingsState {}

const AdminContext = createContext<IAdminContext | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { league, refetch } = useLeagueContext();

  const meetings = useLeagueMeetings(league);
  const players = useLeaguePlayers(refetch);
  const tables = useLeagueTables();
  const settings = useLeagueSettings();

  return (
    <AdminContext.Provider value={{ ...meetings, ...players, ...tables, ...settings }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = (): IAdminContext => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminContext must be used within AdminProvider");
  return ctx;
};
