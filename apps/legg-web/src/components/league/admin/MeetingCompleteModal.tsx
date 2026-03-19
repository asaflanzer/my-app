import { Loader } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAdminContext } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";

export const MeetingCompleteModal = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { confirmComplete, setConfirmComplete, completeMeeting } =
    useAdminContext();

  if (confirmComplete === null) return null;

  return (
    <div
      onClick={() => setConfirmComplete(null)}
      className="fixed inset-0 bg-black/80 flex items-end z-[100]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm sm:mx-auto bg-card border border-card-border rounded-t-[18px] px-5 pt-[22px] pb-8 space-y-4"
      >
        <div className="text-center text-lg font-extrabold">End Meeting?</div>
        <p className="text-center text-sm text-muted-foreground">
          Are you sure you wish to end Meeting #{confirmComplete.meetingNumber}?
        </p>
        <Button
          onClick={() =>
            leagueId &&
            completeMeeting.mutate({
              leagueId,
              meetingId: confirmComplete.id,
            })
          }
          disabled={completeMeeting.isPending}
          className="w-full"
        >
          {completeMeeting.isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            "Yes, end meeting"
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => setConfirmComplete(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
