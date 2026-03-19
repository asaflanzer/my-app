import { useState, useRef } from "react";

interface IContactSectionProps {
  onSend: (message: string) => void;
  isSending: boolean;
}

export const ContactSection = ({ onSend, isSending }: IContactSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToggle = () => {
    setIsOpen((v) => !v);
    if (!isOpen) setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setMessage("");
  };

  const handleSend = () => {
    onSend(message);
    setMessage("");
    setIsOpen(false);
  };

  return (
    <>
      <p className="text-sm text-neutral-500 text-center">
        Want to host an event?{" "}
        <button
          className="text-primary underline underline-offset-2"
          onClick={handleToggle}
        >
          Drop us a message
        </button>
      </p>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "240px" : "0px" }}
      >
        <div className="pt-1 space-y-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your event…"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className="flex-1 rounded-md bg-primary text-primary-foreground text-sm py-1.5 font-medium disabled:opacity-50"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
