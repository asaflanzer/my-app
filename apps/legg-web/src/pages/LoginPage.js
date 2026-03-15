import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OAuthButton } from "@/components/auth/OAuthButton";
import { useTheme } from "@/lib/use-theme";
export const LoginPage = () => {
    useTheme();
    const { data: session, isPending } = useSession();
    if (isPending) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" }) }));
    }
    if (session) {
        return _jsx(Navigate, { to: "/leagues", replace: true });
    }
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background p-4", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { className: "space-y-1 text-center", children: [_jsx(CardTitle, { className: "text-3xl font-bold", children: "Welcome back" }), _jsx(CardDescription, { children: "Sign in to your account to continue" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx(OAuthButton, { provider: "google", label: "Continue with Google" }), _jsx(OAuthButton, { provider: "facebook", label: "Continue with Facebook" }), _jsx(OAuthButton, { provider: "apple", label: "Continue with Apple" }), _jsx(Separator, {}), _jsxs("p", { className: "text-center text-xs text-muted-foreground", children: ["By continuing, you agree to our", " ", _jsx("a", { href: "/terms", className: "underline underline-offset-4 hover:text-primary", children: "Terms of Service" }), " ", "and", " ", _jsx("a", { href: "/privacy", className: "underline underline-offset-4 hover:text-primary", children: "Privacy Policy" }), "."] })] })] }) }));
};
