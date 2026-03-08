import { TouchableOpacity, Text, View } from "react-native";
import { signIn } from "@/lib/auth-client";

type Provider = "google" | "facebook" | "apple";

interface OAuthButtonProps {
  provider: Provider;
  label: string;
  callbackURL?: string;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "G",
  facebook: "f",
  apple: "",
};

export const OAuthButton = ({ provider, label, callbackURL = "my-app://dashboard" }: OAuthButtonProps) => {
  const handlePress = () => {
    signIn.social({ provider, callbackURL });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 dark:border-gray-700 dark:bg-gray-900"
      activeOpacity={0.7}
    >
      <View className="h-5 w-5 items-center justify-center">
        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {PROVIDER_LABELS[provider]}
        </Text>
      </View>
      <Text className="text-base font-medium text-gray-800 dark:text-gray-200">
        {label}
      </Text>
    </TouchableOpacity>
  );
};
