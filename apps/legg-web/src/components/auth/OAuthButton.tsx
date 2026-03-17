import { Button } from "@/components/ui/button";

type Provider = "google" | "facebook" | "apple";

interface OAuthButtonProps {
  provider: Provider;
  label: string;
  callbackURL?: string;
}

const PROVIDER_ICONS: Record<Provider, string> = {
  google: "G",
  facebook: "f",
  apple: "",
};

export const OAuthButton = ({ provider, label, callbackURL = `${window.location.origin}/` }: OAuthButtonProps) => {
  const handleClick = () => {
    // Use full-page navigation instead of fetch so the browser treats the auth
    // server as first-party — required for mobile Safari ITP cookie handling.
    const apiUrl = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";
    window.location.href = `${apiUrl}/api/auth/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(callbackURL)}`;
  };

  return (
    <Button
      variant="outline"
      className="w-full gap-3"
      onClick={handleClick}
    >
      <span className="flex h-5 w-5 items-center justify-center font-bold text-sm">
        {PROVIDER_ICONS[provider]}
      </span>
      {label}
    </Button>
  );
};
