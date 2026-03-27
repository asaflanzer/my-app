import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

interface IAppContext {
  isLoading: boolean;
  incrementLoading: () => void;
  decrementLoading: () => void;
}

const AppContext = createContext<IAppContext | null>(null);

const MIN_DISPLAY_MS = 300;

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const countRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incrementLoading = useCallback(() => {
    countRef.current += 1;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    // flushSync forces React to render immediately so the spinner appears
    // before the network response arrives (even on fast localhost)
    flushSync(() => setIsLoading(true));
  }, []);

  const decrementLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      // Keep spinner visible for at least MIN_DISPLAY_MS for friendly UX
      hideTimer.current = setTimeout(() => {
        setIsLoading(false);
        hideTimer.current = null;
      }, MIN_DISPLAY_MS);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{ isLoading, incrementLoading, decrementLoading }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): IAppContext => {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
};
