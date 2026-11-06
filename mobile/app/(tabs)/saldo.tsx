import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { money, motoristaApi } from "@/src/lib/api";

export default function SaldoScreen() {
  const { token } = useAuth();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErro(null);
    try {
      const res = await motoristaApi.saldo(token);
      setSaldo(res.saldo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#059669" />}
    >
      <Text style={styles.heading}>Conta corrente</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Saldo atual</Text>
        {loading && saldo === null ? (
          <ActivityIndicator color="#059669" style={{ marginTop: 12 }} />
        ) : (
          <Text style={styles.valor}>{money(saldo ?? 0)}</Text>
        )}
        <Text style={styles.legenda}>
          Positivo = empresa deve a você · Negativo = devolução pendente
        </Text>
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16 },
  heading: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: {
    backgroundColor: "#171717",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
  },
  label: { color: "#9ca3af", fontSize: 13 },
  valor: { color: "#fff", fontSize: 32, fontWeight: "700", marginTop: 8 },
  legenda: { color: "#6b7280", fontSize: 12, marginTop: 12 },
  erro: { color: "#f87171", marginTop: 12 },
});
