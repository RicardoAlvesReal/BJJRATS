import fs from "node:fs";

const cfgPath = "capacitor.config.ts";
const raw = fs.readFileSync(cfgPath, "utf8");

const serverUrl = raw.match(/url:\s*["'`](https?:\/\/[^"'`]+)["'`]/)?.[1] ?? null;
const appId = raw.match(/appId:\s*["'`]([^"'`]+)["'`]/)?.[1] ?? null;
const webDir = raw.match(/webDir:\s*["'`]([^"'`]+)["'`]/)?.[1] ?? null;
const apiUrl = process.env.VITE_API_URL ?? "";
const turnstileKey = process.env.VITE_TURNSTILE_SITE_KEY ?? "";
const problems = [];
const warnings = [];

if (apiUrl && !/^https?:\/\//.test(apiUrl)) {
  problems.push(`VITE_API_URL precisa ser URL absoluta, veio "${apiUrl}"`);
}

if (serverUrl) {
  console.log(`Modo remoto: webview carrega de ${serverUrl}`);
  console.log(`Assets de ${webDir} sao empacotados mas nao usados em runtime.`);
  console.log(`VITE_API_URL em branco resolve para ${serverUrl} (ok).`);
  if (!turnstileKey) {
    warnings.push("VITE_TURNSTILE_SITE_KEY ausente - bundle usa a chave de teste da Cloudflare.");
  }
} else {
  console.log(`Modo empacotado: webview serve de ${webDir}`);
  console.log(`Origem do app: capacitor://localhost`);
  if (!apiUrl) {
    problems.push(
      "server.url ausente e VITE_API_URL vazio: a API resolveria para capacitor://localhost/api e nenhuma chamada funcionaria.",
    );
  } else if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(apiUrl)) {
    problems.push(`VITE_API_URL aponta para localhost ("${apiUrl}") - invalido para build de distribuicao.`);
  } else {
    console.log(`VITE_API_URL=${apiUrl}`);
  }
  if (!turnstileKey) {
    problems.push(
      "VITE_TURNSTILE_SITE_KEY ausente: TurnstileWidget.tsx cai no default 1x00000000000000000000AA, que aprova qualquer captcha.",
    );
  }
}

const iosBundleId = fs
  .readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8")
  .match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)?.[1]
  .trim();

if (appId && iosBundleId && appId !== iosBundleId) {
  warnings.push(
    `appId do capacitor.config.ts ("${appId}") difere do bundle ID nativo do iOS ("${iosBundleId}").`,
  );
}

if (problems.length > 0) {
  console.error("");
  for (const p of problems) console.error(`FALHA: ${p}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("");
  for (const w of warnings) console.warn(`AVISO: ${w}`);
}

console.log(`Bundle ID iOS: ${iosBundleId}`);
console.log("Preflight OK.");
