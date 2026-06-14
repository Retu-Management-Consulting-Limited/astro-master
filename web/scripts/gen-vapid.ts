// Generate a VAPID keypair for Web Push.
//   bun run scripts/gen-vapid.ts
// Put the public key in NEXT_PUBLIC_VAPID_PUBLIC_KEY (client + build), the
// private key in VAPID_PRIVATE_KEY (server only — set in Vercel, never commit).
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
console.log("VAPID_SUBJECT=mailto:hello@vapeincity.com   # optional, defaults to this");
console.log("PUSH_CRON_SECRET=" + webpush.generateVAPIDKeys().privateKey.slice(0, 24) + "   # for /api/push/send auth");
