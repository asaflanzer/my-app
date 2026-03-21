import { Loader } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export const GlobalSpinner = () => {
  const { isLoading } = useAppContext();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-spinner-fade-in">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};
