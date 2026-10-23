// No web isto sincronizava abas do navegador (BroadcastChannel). No celular só
// existe uma instância do app, e o realtime do Supabase já traz mudanças feitas
// em outros aparelhos. As funções ficam como no-op para manter a mesma API.

export function broadcastReloadComplete(): void {}

export function markCrossTabMutations(_tables: string[]): void {}
