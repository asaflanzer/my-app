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

export const OAuthButton = ({
  provider,
  label,
  callbackURL = `${window.location.origin}/`,
}: OAuthButtonProps) => {
  const handleClick = async () => {
    try {
      const result = await signIn.social({ provider, callbackURL });
      if (result?.error) {
        if (import.meta.env.DEV)
          console.error(`[${provider} sign-in error]`, result.error);
        alert("Sign-in failed. Please try again.");
      }
    } catch (err) {
      if (import.meta.env.DEV)
        console.error(`[${provider} sign-in exception]`, err);
      alert("Sign-in failed. Please try again.");
    }
  };

  return (
    <Button variant="outline" className="w-full gap-3" onClick={handleClick}>
      <span className="flex h-5 w-5 items-center justify-center font-bold text-sm">
        {PROVIDER_ICONS[provider]}
      </span>
      {label}
    </Button>
  );
};
