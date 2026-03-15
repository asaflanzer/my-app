import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
const LeagueContext = createContext(null);
export const LeagueProvider = ({ children }) => {
    const { leagueId } = useParams();
    const { data: league, isLoading, refetch } = trpc.league.getById.useQuery({ leagueId: leagueId ?? "" }, { enabled: !!leagueId });
    return (_jsx(LeagueContext.Provider, { value: {
            league,
            isLoading,
            isAdmin: league?.isAdmin ?? false,
            myMemberId: league?.myMemberId,
            refetch,
        }, children: children }));
};
export const useLeagueContext = () => {
    const ctx = useContext(LeagueContext);
    if (!ctx)
        throw new Error("useLeagueContext must be used within LeagueProvider");
    return ctx;
};
