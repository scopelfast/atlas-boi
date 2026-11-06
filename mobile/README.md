# Atlas Boi — App Motorista (React Native / Expo)

App Android nativo para motoristas: viagens, despesas com câmera e saldo da conta corrente.

## Pré-requisitos

- Node.js 20+
- Backend Atlas Boi rodando (`cd backend && npm run dev` → porta **3004**)
- [Android Studio](https://developer.android.com/studio) (emulador) ou celular com [Expo Go](https://expo.dev/go)

## Desenvolvimento rápido (Expo Go)

**Importante:** rode na pasta `mobile/` ou na raiz do repo (`npm run mobile:start`).  
No PowerShell use `;` em vez de `&&`:

```powershell
cd c:\gitHub\atlas-boi\mobile
npm start
```

Ou da raiz:

```powershell
cd c:\gitHub\atlas-boi
npm run mobile:start
```

Do backend também funciona:

```powershell
cd c:\gitHub\atlas-boi\backend
npm run mobile:start
```

Escaneie o QR com Expo Go. **Celular físico:** defina a URL da API com o IP da sua máquina:

```bash
# Windows PowerShell — exemplo
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:3004"
npm start
```

## Emulador Android

O app usa `http://10.0.2.2:3004` automaticamente (host do PC no emulador).

```bash
npm run android
```

## Build APK / AAB (Play Store)

Requer conta [Expo EAS](https://expo.dev/eas) — login: `eas login`

```powershell
cd c:\gitHub\atlas-boi\mobile

# 1) Vincular projeto (só na primeira vez)
npx eas init --non-interactive --force

# 2) Configurar build Android (só na primeira vez)
npx eas build:configure --platform android

# 3) Gerar APK de teste
npx eas build -p android --profile preview

# 4) Gerar AAB para Play Store
npx eas build -p android --profile production
```

Da raiz do repo:

```powershell
cd c:\gitHub\atlas-boi
npm run mobile:build:apk
npm run mobile:build:aab
```

Projeto EAS: `@scopel/atlas-boi-motorista`

> **Nota sobre AAR:** bibliotecas `.aar` são módulos nativos Android para embed em outro app. Este projeto gera **APK/AAB** instalável. Se precisar de AAR (SDK embutido), avise — é um fluxo Gradle separado.

## Login

1. No painel web: **Motoristas** → editar motorista → CPF + **senha do app**
2. No app: CPF + senha
3. Demo (seed): `123.456.789-01` / `motor123`

## Estrutura

```
mobile/
├── app/              # Expo Router (login + tabs)
├── src/lib/api.ts    # Cliente REST /api/motorista/*
└── src/context/      # Sessão SecureStore
```

## Roadmap mobile

- [x] Login CPF/senha
- [x] Viagens ativas
- [x] Despesa + câmera/galeria
- [x] Saldo CC
- [ ] Prestação de contas
- [ ] Push notifications
- [ ] Offline / sync
- [ ] GPS (opcional)
