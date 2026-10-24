// Pré-visualização no navegador com dados de exemplo (sem Supabase).
// Uso: npm run demo:web
const { spawn } = require("node:child_process");
const path = require("node:path");

const projectDir = path.resolve(__dirname, "..");
const cacheDir = path.resolve(projectDir, "..", ".cache");

const child = spawn("npx", ["expo", "start", "--web", "--port", "8082"], {
  // Roda sempre dentro de transição/, mesmo se chamado da raiz (ex.: launch.json).
  cwd: projectDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    EXPO_PUBLIC_DEMO: "1",
    EXPO_NO_TELEMETRY: "1",
    // Mantém caches do npm/Expo fora do disco C:.
    npm_config_cache: path.join(cacheDir, "npm"),
    __UNSAFE_EXPO_HOME_DIRECTORY: path.join(cacheDir, "expo-home"),
  },
});

child.on("exit", code => process.exit(code ?? 0));
