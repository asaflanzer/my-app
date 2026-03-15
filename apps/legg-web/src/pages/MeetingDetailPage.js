import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";
export const MeetingDetailPage = () => {
    const { leagueId, meetingId } = useParams();
    const navigate = useNavigate();
    const { league, isAdmin } = useLeagueContext();
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editState, setEditState] = useState({
        player1Id: "",
        player2Id: "",
        score1: 0,
        score2: 0,
    });
    const utils = trpc.useUtils();
    const { data: matches, isLoading } = trpc.meeting.getMatchesByMeeting.useQuery({ leagueId: leagueId ?? "", meetingId: meetingId ?? "" }, { enabled: !!leagueId && !!meetingId });
    const updateMatch = trpc.meeting.updateMatchRecord.useMutation({
        onSuccess: () => {
            void utils.meeting.getMatchesByMeeting.invalidate({
                leagueId: leagueId ?? "",
                meetingId: meetingId ?? "",
            });
            setEditingMatchId(null);
            toast("Match updated!");
        },
        onError: (e) => toast.error(e.message),
    });
    const meetingNumber = matches?.[0]?.meetingNumber;
    const activeMembers = league?.members.filter((m) => !m.disabled) ?? [];
    const startEdit = (match) => {
        setEditingMatchId(match.id);
        setEditState({
            player1Id: match.player1Id ?? "",
            player2Id: match.player2Id ?? "",
            score1: match.score1,
            score2: match.score2,
        });
    };
    const handleSave = () => {
        if (!editingMatchId || !leagueId)
            return;
        updateMatch.mutate({
            leagueId,
            matchId: editingMatchId,
            player1Id: editState.player1Id || null,
            player2Id: editState.player2Id || null,
            score1: editState.score1,
            score2: editState.score2,
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50", children: _jsx(Breadcrumb, { children: _jsxs(BreadcrumbList, { children: [_jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate("/leagues"), children: "Leagues" }) }) }), _jsx(BreadcrumbSeparator, {}), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate(`/league/${leagueId}`), children: league?.name ?? "League" }) }) }), _jsx(BreadcrumbSeparator, {}), isAdmin && (_jsxs(_Fragment, { children: [_jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate(`/league/${leagueId}/admin`), children: "Admin" }) }) }), _jsx(BreadcrumbSeparator, {})] })), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbPage, { children: meetingNumber != null
                                        ? `Meeting #${meetingNumber}`
                                        : "Meeting" }) })] }) }) }), _jsxs("main", { className: "mx-auto max-w-2xl px-4 py-6 space-y-6", children: [_jsx("h1", { className: "text-xl font-bold text-foreground uppercase tracking-widest", children: meetingNumber != null ? `Meeting #${meetingNumber}` : "Meeting" }), isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) })) : !matches || matches.length === 0 ? (_jsx("div", { className: "text-center text-muted-foreground text-sm py-12 border border-border rounded-xl", children: "No completed matches for this meeting yet." })) : (_jsx("div", { className: "space-y-2", children: matches.map((match) => {
                            const isEditing = editingMatchId === match.id;
                            const winnerIsP1 = match.winnerId === match.player1Id;
                            const winnerIsP2 = match.winnerId === match.player2Id;
                            return (_jsx("div", { className: "bg-card border border-card-border rounded-xl px-4 py-3", children: isEditing ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Select, { value: editState.player1Id, onValueChange: (v) => setEditState((s) => ({ ...s, player1Id: v })), children: [_jsx(SelectTrigger, { className: "h-8 text-sm flex-1", children: _jsx(SelectValue, { placeholder: "Player 1" }) }), _jsx(SelectContent, { children: activeMembers.map((m) => (_jsx(SelectItem, { value: m.id, children: m.userName }, m.id))) })] }), _jsxs("div", { className: "flex items-center gap-1 flex-shrink-0", children: [_jsx(Input, { type: "number", min: 0, value: editState.score1, onChange: (e) => setEditState((s) => ({
                                                                ...s,
                                                                score1: Math.max(0, Number(e.target.value)),
                                                            })), className: "h-8 w-12 text-center text-sm px-1" }), _jsx("span", { className: "text-muted-foreground text-xs", children: "\u2013" }), _jsx(Input, { type: "number", min: 0, value: editState.score2, onChange: (e) => setEditState((s) => ({
                                                                ...s,
                                                                score2: Math.max(0, Number(e.target.value)),
                                                            })), className: "h-8 w-12 text-center text-sm px-1" })] }), _jsxs(Select, { value: editState.player2Id, onValueChange: (v) => setEditState((s) => ({ ...s, player2Id: v })), children: [_jsx(SelectTrigger, { className: "h-8 text-sm flex-1", children: _jsx(SelectValue, { placeholder: "Player 2" }) }), _jsx(SelectContent, { children: activeMembers.map((m) => (_jsx(SelectItem, { value: m.id, children: m.userName }, m.id))) })] })] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setEditingMatchId(null), className: "text-xs", children: "Cancel" }), _jsxs(Button, { size: "sm", onClick: handleSave, disabled: updateMatch.isPending, className: "text-xs", children: [_jsx(Check, { className: "w-3 h-3 mr-1" }), "Save"] })] })] })) : (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "text-[10px] text-muted-foreground font-mono flex-shrink-0", children: ["T", match.tableNumber] }), _jsxs("div", { className: "flex-1 flex items-center justify-between min-w-0", children: [_jsx("span", { className: cn("text-sm truncate max-w-[35%]", winnerIsP1
                                                        ? "font-bold text-emerald-500"
                                                        : "text-foreground"), children: match.player1Name ?? "—" }), _jsxs("div", { className: "flex items-center gap-1 flex-shrink-0 mx-2", children: [_jsx("span", { className: cn("text-sm font-bold w-5 text-center", winnerIsP1
                                                                ? "text-emerald-500"
                                                                : "text-foreground"), children: match.score1 }), _jsx("span", { className: "text-muted-foreground text-xs", children: "\u2013" }), _jsx("span", { className: cn("text-sm font-bold w-5 text-center", winnerIsP2
                                                                ? "text-emerald-500"
                                                                : "text-foreground"), children: match.score2 })] }), _jsx("span", { className: cn("text-sm truncate max-w-[35%] text-right", winnerIsP2
                                                        ? "font-bold text-emerald-500"
                                                        : "text-foreground"), children: match.player2Name ?? "—" })] }), isAdmin && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground", onClick: () => startEdit(match), "aria-label": "Edit match", children: _jsx(Pencil, { className: "h-3 w-3" }) }))] })) }, match.id));
                        }) }))] })] }));
};
