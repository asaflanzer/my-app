import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Loader, Logs, MinusIcon, PlusIcon, Tablet, X, } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useLeagueContext } from "@/contexts/LeagueContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "@/components/ui/collapsible";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, } from "@/components/ui/drawer";
const ScorePill = ({ v, active, winner, onPick }) => (_jsx("button", { onClick: onPick, className: cn("w-9 h-9 rounded-full text-sm font-bold cursor-pointer transition-opacity border-2", active
        ? winner
            ? "border-secondary bg-secondary/15 text-secondary"
            : "border-primary text-primary"
        : "border-border bg-transparent text-muted-foreground"), children: v }));
export const LeaguePage = () => {
    const navigate = useNavigate();
    const { leagueId } = useParams();
    const { data: session, isPending: sessionPending } = useSession();
    const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !!session });
    const userIsAdmin = me?.isAdmin ?? false;
    const { league, isLoading: leagueLoading, myMemberId } = useLeagueContext();
    const { data: activeMeeting, refetch: refetchMeeting } = trpc.meeting.getActive.useQuery({ leagueId: leagueId ?? "" }, { enabled: !!leagueId, refetchInterval: 5000 });
    const utils = trpc.useUtils();
    const invalidate = () => {
        void utils.meeting.getActive.invalidate({ leagueId: leagueId ?? "" });
        void utils.league.getById.invalidate({ leagueId: leagueId ?? "" });
    };
    const toggleReady = trpc.meeting.toggleReady.useMutation({
        onSuccess: (data) => {
            invalidate();
            toast(data.status === "ready"
                ? "You're ready to play!"
                : "Taking a break — see you soon!");
        },
        onError: (e) => toast.error(e.message),
    });
    const draw = trpc.meeting.draw.useMutation({
        onSuccess: () => invalidate(),
        onError: (e) => toast.error(e.message),
    });
    const updateScore = trpc.meeting.updateScore.useMutation({
        onSuccess: () => void refetchMeeting(),
    });
    const submitScore = trpc.meeting.submitScore.useMutation({
        onSuccess: () => {
            invalidate();
            setModal(null);
            toast("Score submitted!");
        },
        onError: (e) => toast.error(e.message),
    });
    const takeBreak = trpc.meeting.takeBreak.useMutation({
        onSuccess: () => {
            invalidate();
            setOptOutModal(false);
            toast("Taking a break — see you soon!");
        },
        onError: (e) => toast.error(e.message),
    });
    const shufflePlayer = trpc.meeting.shufflePlayer.useMutation({
        onSuccess: () => {
            invalidate();
            setOptOutModal(false);
            toast("Swapped in — enjoy your break!");
        },
        onError: (e) => toast.error(e.message),
    });
    const [simPast7, setSimPast7] = useState(false);
    const [modal, setModal] = useState(null); // tableId
    const [sv, setSv] = useState({ s1: 0, s2: 0 });
    const [standingsOpen, setStandingsOpen] = useState(() => {
        const v = sessionStorage.getItem("standings-open");
        return v === null ? true : v === "true";
    });
    const [tablesOpen, setTablesOpen] = useState(() => {
        const v = sessionStorage.getItem("tables-open");
        return v === null ? true : v === "true";
    });
    const [is9ball, setIs9ball] = useState(false);
    const [optOutModal, setOptOutModal] = useState(false);
    const [standingsExpanded, setStandingsExpanded] = useState(false);
    const [historyMemberId, setHistoryMemberId] = useState(null);
    const { data: playerHistory, isLoading: historyLoading } = trpc.meeting.getPlayerHistory.useQuery({ leagueId: leagueId ?? "", memberId: historyMemberId ?? "" }, { enabled: !!historyMemberId && !!leagueId });
    // Build enriched player list (members + meeting status)
    const players = useMemo(() => {
        if (!league)
            return [];
        const statusMap = new Map();
        if (activeMeeting) {
            for (const mp of activeMeeting.players) {
                statusMap.set(mp.memberId, mp.status);
            }
        }
        return league.members.map((m) => ({
            id: m.id,
            name: m.userName,
            wins: m.wins,
            losses: m.losses,
            pts: m.pts,
            games: m.games,
            disabled: m.disabled,
            status: statusMap.get(m.id) ?? "available",
        }));
    }, [league, activeMeeting]);
    const allTables = activeMeeting?.tables ?? [];
    // Only show idle and active tables; done tables just update the scoreboard
    const tables = allTables.filter((t) => t.status !== "done");
    // Group player history by meetingNumber — must be before early returns (Rules of Hooks)
    const historyByMeeting = useMemo(() => {
        if (!playerHistory)
            return [];
        const map = new Map();
        for (const match of playerHistory) {
            const group = map.get(match.meetingNumber) ?? [];
            group.push(match);
            map.set(match.meetingNumber, group);
        }
        return [...map.entries()].sort((a, b) => b[0] - a[0]);
    }, [playerHistory]);
    if (sessionPending || leagueLoading) {
        return (_jsx("div", { className: "flex flex-1 items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    if (!session)
        return _jsx(Navigate, { to: "/login", replace: true });
    const getPlayer = (id) => players.find((p) => p.id === id);
    const myPlayer = myMemberId ? getPlayer(myMemberId) : undefined;
    const myReady = myPlayer?.status === "ready";
    const readyList = players.filter((p) => p.status === "ready");
    const now = new Date();
    const isPast7 = simPast7 || now.getHours() >= 19;
    const canDraw = isPast7 && readyList.length >= 2;
    const raceTo = is9ball ? 7 : 3;
    const sorted = [...players].sort((a, b) => {
        if (a.disabled !== b.disabled)
            return a.disabled ? 1 : -1;
        return b.pts - a.pts || b.wins - a.wins;
    });
    const INITIAL_LIMIT = 10;
    const BEFORE_ME = 4;
    const meIndex = sorted.findIndex((p) => p.id === myMemberId);
    const needsTruncation = sorted.length > INITIAL_LIMIT;
    const visibleRows = (() => {
        if (!needsTruncation || standingsExpanded) {
            return sorted.map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
        }
        if (meIndex < INITIAL_LIMIT) {
            return sorted
                .slice(0, INITIAL_LIMIT)
                .map((p, i) => ({ kind: "player", player: p, rank: i + 1 }));
        }
        const afterCount = INITIAL_LIMIT - BEFORE_ME - 2;
        const hiddenCount = meIndex - BEFORE_ME;
        return [
            ...sorted
                .slice(0, BEFORE_ME)
                .map((p, i) => ({ kind: "player", player: p, rank: i + 1 })),
            { kind: "hidden", count: hiddenCount },
            { kind: "player", player: sorted[meIndex], rank: meIndex + 1 },
            ...sorted.slice(meIndex + 1, meIndex + 1 + afterCount).map((p, i) => ({
                kind: "player",
                player: p,
                rank: meIndex + 2 + i,
            })),
        ];
    })();
    const myActiveTable = allTables.find((t) => (t.player1Id === myMemberId || t.player2Id === myMemberId) &&
        t.status === "active");
    const handleToggleReady = () => {
        if (!activeMeeting || !leagueId)
            return;
        toggleReady.mutate({ leagueId, meetingId: activeMeeting.id });
    };
    const handleDraw = () => {
        if (!activeMeeting || !leagueId)
            return;
        draw.mutate({ leagueId, meetingId: activeMeeting.id });
    };
    const handleUpdateTableScore = (tableId, player, delta) => {
        updateScore.mutate({ tableId, player, delta, raceTo });
    };
    const openModal = (tableId) => {
        const t = allTables.find((t) => t.id === tableId);
        if (!t)
            return;
        setSv({ s1: t.score1, s2: t.score2 });
        setModal(tableId);
    };
    const handleSubmitScore = () => {
        if (!modal || !activeMeeting || !leagueId)
            return;
        submitScore.mutate({
            tableId: modal,
            meetingId: activeMeeting.id,
            leagueId,
            raceTo,
        });
    };
    const handleTakeBreak = () => {
        if (!activeMeeting || !leagueId)
            return;
        takeBreak.mutate({ leagueId, meetingId: activeMeeting.id });
    };
    const handleShufflePlayer = () => {
        if (!activeMeeting || !leagueId)
            return;
        shufflePlayer.mutate({ leagueId, meetingId: activeMeeting.id });
    };
    const historyPlayer = historyMemberId
        ? players.find((p) => p.id === historyMemberId)
        : null;
    return (_jsxs("div", { className: "w-full sm:max-w-sm sm:mx-auto text-foreground pb-16", children: [_jsxs("header", { className: "bg-card border-b border-card-border px-[15px] py-[9px] sticky top-0 z-50 flex items-center justify-between", children: [_jsx(Breadcrumb, { children: _jsxs(BreadcrumbList, { children: [_jsx(BreadcrumbItem, { children: _jsx(BreadcrumbLink, { asChild: true, children: _jsx("button", { onClick: () => navigate("/leagues"), children: "Leagues" }) }) }), _jsx(BreadcrumbSeparator, {}), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbPage, { children: league?.name ?? "League" }) })] }) }), userIsAdmin && (_jsx(Button, { size: "xs", className: "bg-amber-500 text-white", onClick: () => navigate(`/league/${leagueId}/admin`), children: "Admin" }))] }), _jsxs("div", { className: "px-[13px] pt-[20px]", children: [!activeMeeting ? (_jsx("div", { className: "text-center text-neutral-500 text-sm py-8", children: "No active meeting tonight. Check back later or ask the admin to activate one." })) : activeMeeting.status === "idle" ? (_jsxs("div", { className: "text-center text-muted-foreground text-sm py-8 border border-border rounded-xl", children: ["Meeting #", activeMeeting.meetingNumber, " is paused.", _jsx("br", {}), _jsx("span", { className: "text-xs", children: "Wait for the host to resume." })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: handleToggleReady, disabled: toggleReady.isPending, variant: myReady || myActiveTable?.status === "active"
                                    ? "outline"
                                    : "default", size: "lg", className: "w-full mb-4 text-xs", children: toggleReady.isPending ? (_jsx(Loader, { className: "animate-spin" })) : myReady || myActiveTable?.status === "active" ? ("Take a Break") : ("Ready to Play") }), readyList.length > 0 && (_jsxs("div", { className: "bg-card border border-border rounded-[10px] px-[13px] py-[10px] mb-[13px] text-xs", children: [_jsxs("div", { className: "text-primary mb-[7px]", children: ["\u270B Ready \u2014", " ", readyList.map((p) => p.name?.split(" ")[0]).join(" · ")] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [!isPast7 && (_jsx(Button, { onClick: () => setSimPast7(true), variant: "ghost", size: "sm", className: "bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-[11px] h-auto py-1 px-[10px] rounded-[10px]", children: "Simulate 7 PM" })), canDraw && (_jsx(Button, { onClick: handleDraw, disabled: draw.isPending, variant: "secondary", size: "sm", className: "text-[11px] h-auto py-1 px-3 rounded-[10px]", children: "Draw Tables" })), !isPast7 && (_jsx("span", { className: "text-muted-foreground text-[11px] leading-6", children: "Draw opens at 7:00 PM" }))] })] })), myActiveTable &&
                                (() => {
                                    const t = myActiveTable;
                                    const p1 = t.player1Id ? getPlayer(t.player1Id) : null;
                                    const p2 = t.player2Id ? getPlayer(t.player2Id) : null;
                                    return (_jsxs("div", { className: "bg-card border border-card-border rounded-xl px-[14px] py-[11px] my-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsxs("span", { className: "text-[11px] font-bold text-neutral-500 tracking-wider uppercase", children: [_jsxs("span", { className: "text-[11px] text-amber-500", children: ["Table", " ", _jsx("span", { className: "text-[15px] text-amber-500", children: t.tableNumber })] }), " ", "Playing Now"] }), _jsxs("div", { className: "flex items-center gap-[6px]", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-[1px] whitespace-nowrap text-foreground", children: is9ball ? "9-BALL" : "8-BALL" }), _jsx(Switch, { size: "xs", checked: is9ball, onCheckedChange: setIs9ball }), _jsx("span", { className: "text-[9px] font-bold text-secondary", children: "\u25CF LIVE" })] })] }), _jsxs("div", { className: "flex items-center gap-2 mb-0.5", children: [(() => {
                                                        return (_jsxs("div", { className: "flex-1 flex flex-col items-start gap-1.5", children: [_jsx("span", { className: "text-sm font-bold text-foreground", children: p1?.name ?? "N/A" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Button, { onClick: () => handleUpdateTableScore(t.id, "1", -1), variant: "ghost", size: "icon", className: "w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl", children: _jsx(MinusIcon, { className: "w-4 h-4" }) }), _jsx(Button, { onClick: () => handleUpdateTableScore(t.id, "1", 1), variant: "ghost", size: "icon", className: "w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl", children: _jsx(PlusIcon, { className: "w-4 h-4" }) })] })] }));
                                                    })(), _jsxs("div", { className: "flex flex-col items-center gap-0.5", children: [_jsxs("h2", { className: "text-[32px] font-extrabold text-foreground m-0 tracking-[2px] text-center min-w-[72px]", children: [_jsx("span", { className: t.score1 > 0
                                                                            ? "text-score-active"
                                                                            : "text-score-dim", children: t.score1 }), _jsxs("span", { className: "text-muted-foreground text-xl", children: [" ", "\u2014", " "] }), _jsx("span", { className: t.score2 > 0
                                                                            ? "text-score-active"
                                                                            : "text-score-dim", children: t.score2 })] }), _jsxs("span", { className: "text-[11px] text-primary uppercase tracking-[1px]", children: ["Race to ", raceTo] })] }), (() => {
                                                        return (_jsxs("div", { className: "flex-1 flex flex-col items-end gap-1.5", children: [_jsx("span", { className: cn("text-sm font-bold", p2?.id === myMemberId
                                                                        ? "text-secondary"
                                                                        : "text-foreground"), children: p2?.name ?? "N/A" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Button, { onClick: () => handleUpdateTableScore(t.id, "2", -1), variant: "ghost", size: "icon", className: "w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl", children: _jsx(MinusIcon, { className: "w-4 h-4" }) }), _jsx(Button, { onClick: () => handleUpdateTableScore(t.id, "2", 1), variant: "ghost", size: "icon", className: "w-10 h-10 rounded-full bg-tinted-btn-bg border border-tinted-btn-border text-tinted-btn-text text-xl", children: _jsx(PlusIcon, { className: "w-4 h-4" }) })] })] }));
                                                    })()] }), _jsxs("div", { className: "flex flex-col gap-2 mt-4", children: [_jsx(Button, { onClick: () => openModal(t.id), variant: "default", size: "sm", children: "Submit Score" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("p", { className: "text-xs", children: "Don't want to play?" }), _jsx(Button, { onClick: () => setOptOutModal(true), variant: "link", size: "xs", className: "p-0", children: "Opt out" })] })] })] }));
                                })()] })), _jsxs(Collapsible, { open: standingsOpen, onOpenChange: (open) => {
                            setStandingsOpen(open);
                            sessionStorage.setItem("standings-open", String(open));
                        }, className: "mb-6", children: [_jsxs(CollapsibleTrigger, { className: "flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0 mt-4 mb-4", children: [_jsxs("h2", { className: "text-[11px] font-bold text-primary tracking-[1.5px] uppercase m-0 flex items-center", children: [_jsx(Logs, { className: "w-4 h-4 mr-2" }), " Standings"] }), _jsx(ChevronDown, { size: 14, className: cn("text-muted-foreground transition-transform duration-200", !standingsOpen && "-rotate-90") })] }), _jsxs(CollapsibleContent, { children: [_jsxs("div", { className: "bg-card border border-card-border rounded-xl overflow-hidden", children: [_jsxs("div", { className: "grid grid-cols-[22px_1fr_28px_28px_28px_36px] px-3 py-[7px] border-b border-muted text-[10px] text-table-header uppercase tracking-[.8px]", children: [_jsx("span", { children: "#" }), _jsx("span", { children: "Player" }), _jsx("span", { className: "text-center", children: "W" }), _jsx("span", { className: "text-center", children: "L" }), _jsx("span", { className: "text-center", children: "GAMES" }), _jsx("span", { className: "text-right", children: "Pts" })] }), visibleRows.length === 0 && (_jsx("div", { className: "px-3 py-4 text-center text-[12px] text-muted-foreground", children: "No players yet." })), visibleRows.map((row) => {
                                                if (row.kind === "hidden") {
                                                    return (_jsx("div", { onClick: () => setStandingsExpanded(true), className: "bg-neutral-800 px-3 py-1 border-b border-muted cursor-pointer hover:bg-muted/30 transition-colors", children: _jsxs("div", { className: "px-2 flex gap-2 items-center justify-center text-[10px] italic tracking-widest", children: [_jsx(Separator, { variant: "secondary", type: "dashed" }), _jsxs("span", { className: "text-primary whitespace-nowrap", children: [row.count, " hidden players"] }), _jsx(Separator, { variant: "secondary", type: "dashed" })] }) }, "hidden"));
                                                }
                                                const { player: p, rank } = row;
                                                const rankCol = [
                                                    "text-yellow-400",
                                                    "text-rank-silver",
                                                    "text-amber-600",
                                                ][rank - 1] ?? "";
                                                const isMe = p.id === myMemberId;
                                                const badge = { playing: "", ready: " ✋", available: "" }[p.status] ?? "";
                                                return (_jsxs("div", { className: cn("grid grid-cols-[22px_1fr_28px_28px_28px_36px] px-3 py-[9px] items-center", "border-b border-muted last:border-b-0", isMe && "bg-me-row"), children: [_jsx("span", { className: cn("text-[11px] font-extrabold", rankCol), children: rank }), _jsxs("span", { className: cn("text-[13px] flex items-center gap-1", isMe
                                                                ? "font-bold text-table-header"
                                                                : "font-normal text-foreground", p.disabled && "line-through opacity-40"), children: [p.name, badge, _jsx("button", { onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        e.currentTarget.blur();
                                                                        setHistoryMemberId(p.id);
                                                                    }, className: "text-muted-foreground hover:text-primary transition-colors flex-shrink-0", "aria-label": `View ${p.name} history`, children: _jsx(Logs, { className: "ml-1 w-3 h-3 text-foreground" }) })] }), _jsx("span", { className: "text-center text-emerald-500 text-[13px] font-semibold", children: p.wins }), _jsx("span", { className: "text-center text-red-400 text-[13px] font-semibold", children: p.losses }), _jsx("span", { className: "text-center text-foreground text-[13px] font-semibold", children: p.games }), _jsx("span", { className: "text-right text-secondary text-sm font-extrabold", children: p.pts })] }, p.id));
                                            })] }), needsTruncation && (_jsx(Button, { onClick: () => setStandingsExpanded((v) => !v), variant: "link", size: "xs", className: "w-full", children: standingsExpanded
                                            ? "View Less"
                                            : `View All (${sorted.length})` }))] })] }), activeMeeting && (_jsxs(Collapsible, { open: tablesOpen, onOpenChange: (open) => {
                            setTablesOpen(open);
                            sessionStorage.setItem("tables-open", String(open));
                        }, className: "my-4", children: [_jsxs(CollapsibleTrigger, { className: "flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0 mb-4", children: [_jsxs("h2", { className: "text-[11px] font-bold text-primary tracking-[1.5px] uppercase m-0 flex items-center", children: [_jsx(Tablet, { className: "w-4 h-4 mr-2" }), " Tables"] }), _jsx(ChevronDown, { size: 14, className: cn("text-muted-foreground transition-transform duration-200", !tablesOpen && "-rotate-90") })] }), _jsx(CollapsibleContent, { children: tables.length === 0 ? (_jsx("div", { className: "text-center text-muted-foreground text-sm py-4", children: "No active tables right now." })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: tables.map((t) => {
                                        const p1 = t.player1Id ? getPlayer(t.player1Id) : null;
                                        const p2 = t.player2Id ? getPlayer(t.player2Id) : null;
                                        const isLive = t.status === "active";
                                        const myTable = (t.player1Id === myMemberId ||
                                            t.player2Id === myMemberId) &&
                                            isLive;
                                        return (_jsxs("div", { className: cn("border rounded-[10px] px-[10px] pt-[9px] pb-2", myTable
                                                ? "bg-game-banner border-game-banner-border"
                                                : "bg-card border-border"), children: [_jsxs("div", { className: "flex justify-between items-center mb-1.5", children: [_jsxs("span", { className: cn("text-[10px] font-bold tracking-[.4px]", myTable ? "text-primary" : "text-table-header"), children: ["TABLE ", t.tableNumber] }), isLive && (_jsx("span", { className: "text-[9px] font-bold text-secondary", children: "\u25CF LIVE" })), !isLive && (_jsx("span", { className: "text-[9px] font-bold text-card-border", children: "\u25CF Idle" }))] }), [
                                                    { player: p1, score: t.score1 },
                                                    { player: p2, score: t.score2 },
                                                ].map(({ player, score }, pi) => (_jsxs("div", { className: cn("flex justify-between items-center", pi === 0 && "mb-0.5"), children: [_jsx("span", { className: cn("text-[12px] max-w-[60%] truncate", !player
                                                                ? "text-foreground"
                                                                : player.id === myMemberId
                                                                    ? "text-me font-bold text-table-header"
                                                                    : "text-foreground"), children: player ? player.name : "N/A" }), _jsx("span", { className: cn("text-sm font-extrabold ml-1", score > 0
                                                                ? "text-score-active"
                                                                : "text-score-dim"), children: score })] }, pi)))] }, t.id));
                                    }) })) })] }))] }), modal !== null &&
                (() => {
                    const t = allTables.find((t) => t.id === modal);
                    if (!t || !t.player1Id || !t.player2Id)
                        return null;
                    const p1 = getPlayer(t.player1Id), p2 = getPlayer(t.player2Id);
                    const valid = (sv.s1 === raceTo) !== (sv.s2 === raceTo);
                    return (_jsx("div", { onClick: () => setModal(null), className: "fixed inset-0 bg-black/40 flex items-end z-[100]", children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full sm:max-w-sm sm:mx-auto bg-background border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8", children: [_jsx("div", { className: "text-center text-lg font-extrabold mb-0.5", children: "Submit Score" }), _jsxs("div", { className: "text-center text-xs text-primary mb-[22px]", children: ["Table ", t.tableNumber, " \u00B7 Race to ", raceTo] }), [
                                    { player: p1, key: "s1" },
                                    { player: p2, key: "s2" },
                                ].map(({ player, key }) => (_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("span", { className: "text-[15px] font-bold text-foreground", children: player?.name }), _jsx("div", { className: "flex gap-[7px]", children: Array.from({ length: raceTo + 1 }, (_, i) => i).map((v) => (_jsx(ScorePill, { v: v, active: sv[key] === v, winner: v === raceTo && sv[key] === raceTo, onPick: () => setSv((prev) => ({ ...prev, [key]: v })) }, v))) })] }, key))), !valid && sv.s1 + sv.s2 > 0 && (_jsxs("p", { className: "text-center text-red-400 text-xs mb-2.5", children: ["One player must reach ", raceTo, " wins"] })), _jsx(Button, { onClick: handleSubmitScore, disabled: !valid || submitScore.isPending, className: cn("w-full h-auto py-[15px] text-base mt-1.5 rounded-[10px]", valid
                                        ? "bg-btn-primary text-btn-primary-foreground"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"), children: submitScore.isPending ? "Submitting…" : "Confirm Result" })] }) }));
                })(), optOutModal &&
                myActiveTable &&
                (() => {
                    const hasAvailable = players.some((p) => p.status === "available" && p.id !== myMemberId);
                    return (_jsx("div", { onClick: () => setOptOutModal(false), className: "fixed inset-0 bg-black/40 flex items-end z-[100]", children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full sm:max-w-sm sm:mx-auto bg-background border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8", children: [_jsx("div", { className: "text-center text-lg font-extrabold mb-4", children: "Opt Out" }), _jsxs(Button, { onClick: handleShufflePlayer, disabled: !hasAvailable || shufflePlayer.isPending, variant: "outline", className: cn("w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px]", hasAvailable
                                        ? "bg-tinted-btn-bg border-tinted-btn-border text-tinted-btn-text"
                                        : "bg-muted border-border text-foreground cursor-not-allowed"), children: [_jsx("span", { className: "text-sm font-bold", children: hasAvailable
                                                ? "Shuffle player"
                                                : "Shuffle player (no one available)" }), _jsx("span", { className: "text-[11px] text-foreground font-normal", children: "Replace me with an available player" })] }), _jsxs(Button, { onClick: handleTakeBreak, disabled: takeBreak.isPending, variant: "outline", className: "w-full h-auto flex-col items-start px-4 py-[14px] text-left gap-0.5 mb-2.5 rounded-[10px] bg-rose-950 border-rose-900 text-foreground", children: [_jsx("span", { className: "text-sm font-bold", children: "Take a break" }), _jsx("span", { className: "text-[11px] text-foreground font-normal", children: "Cancel this game, free the table" })] }), _jsx(Button, { onClick: () => setOptOutModal(false), variant: "ghost", className: "w-full h-auto py-[10px] text-[13px]", children: "Cancel" })] }) }));
                })(), _jsx(Drawer, { open: !!historyMemberId, onOpenChange: (open) => {
                    if (!open)
                        setHistoryMemberId(null);
                }, children: _jsxs(DrawerContent, { className: "h-[100dvh] flex flex-col rounded-none", children: [_jsx(DrawerHeader, { children: _jsxs("div", { className: "flex flex-col gap-1 items-start border-b border-border pb-4", children: [_jsxs("div", { className: "w-full flex items-center justify-between", children: [_jsx(DrawerTitle, { className: "text-base font-bold text-foreground", children: historyPlayer?.name ?? "Player" }), _jsx(DrawerClose, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", children: _jsx(X, { className: "w-4 h-4" }) }) })] }), _jsx(DrawerDescription, { className: "text-xs text-muted-foreground", children: "Viewing player's match history" })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto px-5 py-4", children: historyLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" }) })) : historyByMeeting.length === 0 ? (_jsx("div", { className: "text-center text-muted-foreground text-sm py-12", children: "No games played yet." })) : (_jsx("div", { className: "space-y-6", children: historyByMeeting.map(([meetingNumber, matches]) => (_jsxs("div", { children: [_jsxs("h3", { className: "text-[11px] font-bold text-primary tracking-[1.5px] uppercase mb-2", children: ["Meeting #", meetingNumber] }), _jsx("div", { className: "bg-card border border-card-border rounded-xl overflow-hidden", children: matches.map((match, idx) => (_jsxs("div", { className: cn("flex items-center justify-between px-4 py-3", idx !== matches.length - 1 &&
                                                    "border-b border-muted"), children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: cn("text-[10px] font-bold px-1.5 py-0.5 rounded", match.won
                                                                    ? "bg-emerald-500/15 text-emerald-500"
                                                                    : "bg-red-500/15 text-red-400"), children: match.won ? "W" : "L" }), _jsxs("span", { className: "text-sm text-foreground truncate", children: ["vs ", match.opponentName ?? "Unknown"] })] }), _jsxs("div", { className: "flex items-center gap-1 flex-shrink-0 ml-2", children: [_jsx("span", { className: cn("text-sm font-bold", match.won
                                                                    ? "text-emerald-500"
                                                                    : "text-foreground"), children: match.myScore }), _jsx("span", { className: "text-muted-foreground text-xs", children: "\u2013" }), _jsx("span", { className: cn("text-sm font-bold", !match.won ? "text-red-400" : "text-foreground"), children: match.opponentScore }), _jsxs("span", { className: "text-[10px] text-muted-foreground ml-1", children: ["T", match.tableNumber] })] })] }, match.id))) })] }, meetingNumber))) })) })] }) })] }));
};
