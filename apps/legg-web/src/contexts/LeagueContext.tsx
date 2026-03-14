import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface ILeaguePlayer {
  id: number;
  name: string;
  wins: number;
  losses: number;
  pts: number;
  disabled: boolean;
}

export interface ILeagueSettings {
  startDate: string | undefined;
  startTime: string;
  endDate: string | undefined;
  meetingsPerWeek: number;
  maxPlayers: number;
  activatedMeetings: number;
}

interface ILeagueContext {
  players: ILeaguePlayer[];
  setPlayers: (players: ILeaguePlayer[]) => void;
  settings: ILeagueSettings;
  setSettings: (settings: ILeagueSettings) => void;
}

const DEFAULT_PLAYERS: ILeaguePlayer[] = [
  { id: 1, name: "Alex M.", wins: 0, losses: 7, pts: 1, disabled: false },
  { id: 2, name: "Jordan K.", wins: 4, losses: 3, pts: 9, disabled: false },
  { id: 3, name: "Sam R.", wins: 6, losses: 1, pts: 14, disabled: false },
  { id: 4, name: "Casey T.", wins: 3, losses: 4, pts: 7, disabled: false },
  { id: 5, name: "Morgan L.", wins: 7, losses: 0, pts: 16, disabled: false },
  { id: 6, name: "Riley B.", wins: 2, losses: 5, pts: 5, disabled: false },
  { id: 7, name: "Taylor W.", wins: 4, losses: 3, pts: 10, disabled: false },
  { id: 8, name: "Jamie D.", wins: 1, losses: 6, pts: 3, disabled: false },
  { id: 9, name: "Drew P.", wins: 3, losses: 3, pts: 8, disabled: false },
  { id: 10, name: "Quinn H.", wins: 5, losses: 2, pts: 11, disabled: false },
  { id: 11, name: "Parker N.", wins: 5, losses: 2, pts: 13, disabled: false },
  { id: 12, name: "Blake S.", wins: 2, losses: 5, pts: 4, disabled: false },
  { id: 13, name: "Avery C.", wins: 7, losses: 1, pts: 17, disabled: false },
  { id: 14, name: "Reese M.", wins: 6, losses: 2, pts: 15, disabled: false },
  { id: 15, name: "Skyler J.", wins: 5, losses: 3, pts: 12, disabled: false },
  { id: 16, name: "Finley O.", wins: 4, losses: 4, pts: 10, disabled: false },
  { id: 17, name: "Harper V.", wins: 3, losses: 5, pts: 7, disabled: false },
  { id: 18, name: "Emerson G.", wins: 3, losses: 5, pts: 6, disabled: false },
  { id: 19, name: "Rowan F.", wins: 2, losses: 6, pts: 5, disabled: false },
  { id: 20, name: "Sage A.", wins: 2, losses: 6, pts: 4, disabled: false },
  { id: 21, name: "Phoenix L.", wins: 1, losses: 7, pts: 3, disabled: false },
  { id: 22, name: "Indigo T.", wins: 1, losses: 7, pts: 2, disabled: false },
  { id: 23, name: "River K.", wins: 1, losses: 7, pts: 2, disabled: false },
  { id: 24, name: "Nova B.", wins: 0, losses: 8, pts: 1, disabled: false },
];

const DEFAULT_SETTINGS: ILeagueSettings = {
  startDate: undefined,
  startTime: "19:00",
  endDate: undefined,
  meetingsPerWeek: 1,
  maxPlayers: 26,
  activatedMeetings: 0,
};

const STORAGE_KEY_PLAYERS = "league-players";
const STORAGE_KEY_SETTINGS = "league-settings";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

const LeagueContext = createContext<ILeagueContext | null>(null);

export const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const [players, setPlayersState] = useState<ILeaguePlayer[]>(() =>
    loadFromStorage(STORAGE_KEY_PLAYERS, DEFAULT_PLAYERS),
  );
  const [settings, setSettingsState] = useState<ILeagueSettings>(() =>
    loadFromStorage(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const setPlayers = (next: ILeaguePlayer[]) => setPlayersState(next);
  const setSettings = (next: ILeagueSettings) => setSettingsState(next);

  return (
    <LeagueContext.Provider value={{ players, setPlayers, settings, setSettings }}>
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeagueContext = (): ILeagueContext => {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeagueContext must be used within LeagueProvider");
  return ctx;
};
