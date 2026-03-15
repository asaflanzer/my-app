import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import eightBallUrl from "@/assets/8ball.svg";
export const HomePage = () => {
    const navigate = useNavigate();
    const { data: session, isPending } = useSession();
    if (isPending) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[#0a0a0a]", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    if (session) {
        return _jsx(Navigate, { to: "/leagues", replace: true });
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a]", children: [_jsx("div", { className: "h-24 w-24", style: {
                    animation: "ball-drop 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                }, children: _jsx("img", { src: eightBallUrl, alt: "8 ball", className: "h-full w-full", style: {
                        animation: "ball-spin 1.2s ease-out forwards",
                    } }) }), _jsx("h1", { className: "text-4xl font-bold tracking-widest text-white uppercase", style: {
                    opacity: 0,
                    animation: "fade-down 0.5s ease-out 1.2s forwards",
                }, children: "Legg" }), _jsx("h2", { className: "text-lg text-gray-400 uppercase tracking-widest", style: {
                    opacity: 0,
                    animation: "fade-down 0.5s ease-out 1.6s forwards",
                }, children: _jsx("div", { className: "flex items-center gap-2", children: "Pool League & Tournaments" }) }), _jsx("div", { style: {
                    opacity: 0,
                    animation: "fade-up 0.4s ease-out 2s forwards",
                }, children: _jsx(Button, { size: "lg", className: "px-12 text-base uppercase tracking-widest text-black", onClick: () => navigate("/login"), children: "Login" }) })] }));
};
