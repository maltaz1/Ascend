// Pré-visualização do app no navegador.
// Uso: npm run demo:web  -> dados de exemplo, sem Supabase (porta 8082)
//      npm run web       -> back-end real do .env.local (porta 8084)
const { spawn } = require("node:child_process");
const path = require("node:path");

const real = process.argv.includes("--real");
const projectDir = path.resolve(__dirname, "..");
const cacheDir = path.resolve(projectDir, "..", ".cache");

const child = spawn("npx", ["expo", "start", "--web", "--port", real ? "8084" : "8082"], {
  // Roda sempre dentro de transição/, mesmo se chamado da raiz (ex.: launch.json).
  cwd: projectDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    ...(real ? {} : { EXPO_PUBLIC_DEMO: "1" }),
    EXPO_NO_TELEMETRY: "1",
    // Mantém caches do npm/Expo fora do disco C:.
    npm_config_cache: path.join(cacheDir, "npm"),
    __UNSAFE_EXPO_HOME_DIRECTORY: path.join(cacheDir, "expo-home"),
  },
});

// Encerra o Expo junto, para não deixar a porta presa.
const stop = () => child.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", code => process.exit(code ?? 0));
