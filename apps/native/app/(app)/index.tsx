import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

export default function HomeScreen() {
  const { data: session } = authClient.useSession();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView className="flex-1 px-6">
        <View className="py-8 gap-4">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Home
          </Text>
          {session && (
            <Text className="text-base text-gray-600 dark:text-gray-300">
              Welcome back, {session.user.name ?? session.user.email}!
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
