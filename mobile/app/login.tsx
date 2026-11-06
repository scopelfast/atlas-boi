import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { getApiBaseUrl } from "@/src/lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setLoading(true);
    setErro(null);
    try {
      await login(cpf, password);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>ATLAS BOI</Text>
        <Text style={styles.title}>App do Motorista</Text>
        <Text style={styles.sub}>CPF e senha do portal</Text>

        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={styles.input}
          value={cpf}
          onChangeText={setCpf}
          keyboardType="numeric"
          autoCapitalize="none"
          placeholder="000.000.000-00"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor="#666"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPassword ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={entrar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Entrar</Text>}
        </Pressable>

        <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
        <Text style={styles.hint}>Demo seed: 123.456.789-01 · motor123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    padding: 24,
  },
  card: { maxWidth: 400, width: "100%", alignSelf: "center" },
  brand: { color: "#059669", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  title: { color: "#fff", fontSize: 26, fontWeight: "700", marginTop: 8 },
  sub: { color: "#9ca3af", fontSize: 14, marginBottom: 24 },
  label: { color: "#e5e7eb", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    marginBottom: 14,
  },
  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 72 },
  eyeBtn: { position: "absolute", right: 12, top: 12 },
  eyeText: { color: "#059669", fontSize: 13, fontWeight: "600" },
  erro: { color: "#f87171", marginBottom: 12, fontSize: 14 },
  btn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 10 },
});
