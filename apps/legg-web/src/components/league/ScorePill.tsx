import { cn } from "@/lib/utils";

interface IScorePillProps {
  v: number;
  active: boolean;
  winner: boolean;
  onPick: () => void;
}

export const ScorePill = ({ v, active, winner, onPick }: IScorePillProps) => (
  <button
    onClick={onPick}
    className={cn(
      "w-9 h-9 rounded-full text-sm font-bold cursor-pointer transition-opacity active:scale-90 active:opacity-70 border-2",
      active
        ? winner
          ? "border-secondary bg-secondary/15 text-secondary"
          : "border-primary text-primary"
        : "border-border bg-transparent text-muted-foreground",
    )}
  >
    {v}
  </button>
);
