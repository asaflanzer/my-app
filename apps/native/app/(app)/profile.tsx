import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { authClient, signOut } from "@/lib/auth-client";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 px-6 py-8 gap-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile
        </Text>

        {session && (
          <View className="gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <View className="gap-1">
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Name
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {session.user.name ?? "Not set"}
              </Text>
            </View>
            <View className="gap-1">
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Email
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {session.user.email}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSignOut}
          className="rounded-xl border border-red-200 py-3 items-center"
        >
          <Text className="text-base font-medium text-red-500">Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
