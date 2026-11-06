import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === "login";
    if (!token && !onLogin) {
      router.replace("/login");
    } else if (token && onLogin) {
      router.replace("/(tabs)");
    }
  }, [token, ready, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return <>{children}</>;
}
