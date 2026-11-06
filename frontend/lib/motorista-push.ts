/** Utilitários PWA motorista: SW + Web Push */

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerMotoristaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  // Não misturar com ngrok-sw
  const reg = await navigator.serviceWorker.register("/sw-motorista.js", { scope: "/motorista/" });
  return reg;
}

export async function subscribeMotoristaPush(
  getVapid: () => Promise<{ enabled: boolean; publicKey: string | null }>,
  subscribeApi: (sub: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) => Promise<unknown>
) {
  const vapid = await getVapid();
  if (!vapid.enabled || !vapid.publicKey) {
    throw new Error("Push não configurado no servidor (VAPID)");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada");

  const reg = (await navigator.serviceWorker.getRegistration("/motorista/")) || (await registerMotoristaServiceWorker());
  if (!reg) throw new Error("Service Worker indisponível");

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Subscription incompleta");
  }
  await subscribeApi({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
  return true;
}
