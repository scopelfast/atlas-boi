import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/context/AuthContext";
import { registrarDespesa } from "@/src/lib/api";

export default function DespesasScreen() {
  const { token } = useAuth();
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function tirarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setErro("Permissão de câmera negada");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      setFotoUri(res.assets[0].uri);
      setOk(false);
    }
  }

  async function escolherGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErro("Permissão da galeria negada");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      setFotoUri(res.assets[0].uri);
      setOk(false);
    }
  }

  async function enviar() {
    if (!token) return;
    const v = parseFloat(valor.replace(",", "."));
    if (!v || v <= 0) {
      setErro("Informe o valor da despesa");
      return;
    }
    setLoading(true);
    setErro(null);
    setOk(false);
    try {
      await registrarDespesa(token, {
        valor: v,
        observacoes: obs || undefined,
        fotoUri: fotoUri ?? undefined,
      });
      setOk(true);
      setValor("");
      setObs("");
      setFotoUri(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Lançar despesa</Text>
      <Text style={styles.sub}>Foto do comprovante — OCR no servidor quando possível.</Text>

      <Text style={styles.label}>Valor (R$)</Text>
      <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#666" />

      <Text style={styles.label}>Observações</Text>
      <TextInput style={styles.input} value={obs} onChangeText={setObs} placeholder="Pedágio, combustível…" placeholderTextColor="#666" />

      <View style={styles.fotoRow}>
        <Pressable style={styles.fotoBtn} onPress={tirarFoto}>
          <Text style={styles.fotoBtnText}>Câmera</Text>
        </Pressable>
        <Pressable style={styles.fotoBtn} onPress={escolherGaleria}>
          <Text style={styles.fotoBtnText}>Galeria</Text>
        </Pressable>
      </View>
      {fotoUri ? <Image source={{ uri: fotoUri }} style={styles.preview} /> : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {ok ? <Text style={styles.ok}>Despesa registrada!</Text> : null}

      <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={enviar} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Registrar despesa</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: "#fff", fontSize: 18, fontWeight: "600" },
  sub: { color: "#9ca3af", fontSize: 13, marginTop: 4, marginBottom: 16 },
  label: { color: "#e5e7eb", fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
  },
  fotoRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  fotoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  fotoBtnText: { color: "#059669", fontWeight: "600" },
  preview: { width: "100%", height: 180, borderRadius: 10, marginTop: 12 },
  erro: { color: "#f87171", marginTop: 12 },
  ok: { color: "#34d399", marginTop: 12 },
  btn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700" },
});
