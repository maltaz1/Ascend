interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  setHeader(key: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

// POST /api/sync - endpoint de sincronização (usado pelo service worker antigo
// para background sync via IndexedDB). Aceita POST e retorna JSON.
// O SW atual (v4) não faz mais essa chamada, mas o endpoint mantém
// compatibilidade com navegadores que ainda tenham o SW antigo registrado.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ status: "ok", synced: true });
}
