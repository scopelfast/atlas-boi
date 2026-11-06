import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { motoristaApi, statusLabel, type Viagem } from "@/src/lib/api";

export default function ViagensScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErro(null);
    try {
      setItems(await motoristaApi.viagens(token));
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

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Minhas viagens</Text>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma viagem ativa no momento.</Text>
        }
        renderItem={({ item: v }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/viagem/${v.id}`)}>
            <Text style={styles.numero}>
              {v.numero}
              {v.destaque ? " · prioridade" : ""}
            </Text>
            <Text style={styles.rota}>
              {v.clienteOrigem.cidade}/{v.clienteOrigem.uf} → {v.clienteDestino.cidade}/{v.clienteDestino.uf}
            </Text>
            <Text style={styles.meta}>
              {statusLabel(v.status)} · {v.quantidadeAnimais} animais
              {v.veiculos[0]?.veiculo.placa ? ` · ${v.veiculos[0].veiculo.placa}` : ""}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  heading: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  erro: { color: "#f87171", marginBottom: 8 },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#171717",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 10,
  },
  numero: { color: "#fff", fontWeight: "700", fontSize: 16 },
  rota: { color: "#9ca3af", marginTop: 4 },
  meta: { color: "#d1d5db", fontSize: 12, marginTop: 8 },
});
