import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

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

export const OAuthButton = ({ provider, label, callbackURL = "/dashboard" }: OAuthButtonProps) => {
  const handleClick = () => {
    signIn.social({ provider, callbackURL });
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
