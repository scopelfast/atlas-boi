import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "atlas_motorista_token";
const NOME_KEY = "atlas_motorista_nome";

export async function saveSession(token: string, nome: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(NOME_KEY, nome);
}

export async function loadSession(): Promise<{ token: string; nome: string } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const nome = await SecureStore.getItemAsync(NOME_KEY);
  if (!token || !nome) return null;
  return { token, nome };
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(NOME_KEY);
}
