import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OAuthButton } from "@/components/auth/OAuthButton";

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
      <View className="w-full gap-6">
        <View className="gap-2">
          <Text className="text-center text-4xl font-bold text-foreground dark:text-white">
            Welcome back
          </Text>
          <Text className="text-center text-base text-gray-500">
            Sign in to your account to continue
          </Text>
        </View>

        <View className="gap-3">
          <OAuthButton provider="google" label="Continue with Google" />
          <OAuthButton provider="facebook" label="Continue with Facebook" />
          <OAuthButton provider="apple" label="Continue with Apple" />
        </View>

        <Text className="text-center text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
