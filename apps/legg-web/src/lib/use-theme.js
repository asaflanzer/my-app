import { useEffect, useState } from "react";
const STORAGE_KEY = "legg-theme";
function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark")
        return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}
function applyTheme(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
}
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const t = getInitialTheme();
        applyTheme(t);
        return t;
    });
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    return { theme, toggleTheme };
}
