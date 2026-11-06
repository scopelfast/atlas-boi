import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import { Pressable } from "react-native";
import { useAuth } from "@/src/context/AuthContext";

export default function TabLayout() {
  const { logout, nome } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#059669",
        tabBarStyle: { backgroundColor: "#121212", borderTopColor: "#333" },
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#fff",
        headerTitle: nome ? `Olá, ${nome.split(" ")[0]}` : "Motorista",
        headerRight: () => (
          <Pressable onPress={() => logout()} style={{ marginRight: 16 }}>
            <SymbolView name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }} tintColor="#9ca3af" size={22} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Viagens",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "truck.box", android: "local_shipping", web: "local_shipping" }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="despesas"
        options={{
          title: "Despesas",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "camera", android: "photo_camera", web: "photo_camera" }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="saldo"
        options={{
          title: "Saldo",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "brazilianrealsign.circle", android: "payments", web: "payments" }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
