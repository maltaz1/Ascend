import { Platform, Share } from "react-native";

// Exporta um objeto como JSON. No navegador baixa o arquivo (como o web faz);
// no celular abre a folha de compartilhar do sistema com o conteúdo.
export async function exportJson(filename: string, payload: unknown): Promise<void> {
  const json = JSON.stringify(payload, null, 2);
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: json });
}
