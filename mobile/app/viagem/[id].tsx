import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import {
  motoristaApi,
  money,
  statusLabel,
  type PrestacaoContas,
  type ViagemDetalhe,
} from "@/src/lib/api";

export default function ViagemDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<ViagemDetalhe | null>(null);
  const [prestacao, setPrestacao] = useState<PrestacaoContas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setErro(null);
    try {
      const [v, p] = await Promise.all([
        motoristaApi.viagem(token, id),
        motoristaApi.prestacao(token, id).catch(() => null),
      ]);
      setData(v);
      setPrestacao(p);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function fotoCarga(momento: "EMBARQUE" | "ESTRADA" | "DESCARGA") {
    if (!token || !id) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Câmera", "Permissão necessária para enviar foto da carga.");
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (shot.canceled || !shot.assets[0]) return;
    setBusy(true);
    try {
      await motoristaApi.enviarFoto(token, id, {
        uri: shot.assets[0].uri,
        momento,
        nome: `carga-${momento.toLowerCase()}.jpg`,
      });
      await load();
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  async function confirmarAcerto() {
    if (!token || !id || !prestacao || prestacao.jaFechada) return;
    Alert.alert("Confirmar acerto", "Registrar a prestação de contas desta viagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          setBusy(true);
          try {
            setPrestacao(await motoristaApi.fecharPrestacao(token, id));
            Alert.alert("Pronto", "Acerto confirmado.");
          } catch (e) {
            Alert.alert("Erro", e instanceof Error ? e.message : "Falha ao fechar");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  const fin = data?.financeira;

  return (
    <>
      <Stack.Screen options={{ title: data?.numero ?? "Viagem", headerStyle: { backgroundColor: "#0a0a0a" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {data && (
          <>
            <Text style={styles.status}>{statusLabel(data.status)}</Text>
            <Text style={styles.rota}>
              {data.clienteOrigem?.cidade}/{data.clienteOrigem?.uf} → {data.clienteDestino?.cidade}/
              {data.clienteDestino?.uf}
            </Text>
            <Text style={styles.meta}>
              {data.quantidadeAnimais} animais
              {data.veiculos?.[0]?.veiculo?.placa ? ` · ${data.veiculos[0].veiculo.placa}` : ""}
            </Text>

            {fin && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Acerto da viagem</Text>
                <Text style={styles.saldo}>{money(fin.saldoViagem ?? 0)}</Text>
                <Text style={styles.hint}>Saldo do seu CC nesta viagem (sem frete do cliente)</Text>
              </View>
            )}

            {prestacao && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Prestação de contas</Text>
                {prestacao.jaFechada ? (
                  <Text style={styles.ok}>Acerto já confirmado</Text>
                ) : (
                  <Pressable
                    style={[styles.btn, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={confirmarAcerto}
                  >
                    <Text style={styles.btnText}>Confirmar acerto</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Fotos da carga</Text>
              <View style={styles.row}>
                {(["EMBARQUE", "ESTRADA", "DESCARGA"] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.chip, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() => fotoCarga(m)}
                  >
                    <Text style={styles.chipText}>{m.charAt(0) + m.slice(1).toLowerCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.fotos}>
                {(data.fotos ?? []).slice(0, 6).map((f) => (
                  <View key={f.id} style={styles.fotoThumb}>
                    <Text style={styles.fotoLabel}>{f.momento}</Text>
                  </View>
                ))}
                {(data.fotos ?? []).length === 0 && (
                  <Text style={styles.hint}>Nenhuma foto ainda — use a câmera acima.</Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  erro: { color: "#f87171", marginBottom: 8 },
  status: { color: "#34d399", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  rota: { color: "#fff", fontSize: 18, fontWeight: "600" },
  meta: { color: "#9ca3af", marginTop: 4, marginBottom: 16 },
  box: {
    backgroundColor: "#171717",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
  },
  boxTitle: { color: "#fff", fontWeight: "600", marginBottom: 8 },
  saldo: { color: "#34d399", fontSize: 28, fontWeight: "700" },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  ok: { color: "#34d399" },
  btn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#262626",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#404040",
  },
  chipText: { color: "#e5e5e5", fontSize: 12 },
  fotos: { marginTop: 12, gap: 6 },
  fotoThumb: {
    backgroundColor: "#262626",
    borderRadius: 8,
    padding: 10,
  },
  fotoLabel: { color: "#a3a3a3", fontSize: 12 },
});
