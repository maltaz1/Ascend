// Validação da foto de perfil antes do upload.
// O bucket Avatars também barra no servidor (2 MB, só JPEG/PNG/WebP, só na
// pasta do próprio usuário); aqui é para dar uma mensagem clara antes.

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AvatarType = keyof typeof EXT_BY_TYPE;

// Descobre o tipo pelo conteúdo (magic bytes), não pela extensão nem pelo
// MIME informado pelo navegador.
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}

// Caminho com nome aleatório dentro da pasta do usuário.
export function avatarPath(userId: string, type: AvatarType): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${id}.${EXT_BY_TYPE[type]}`;
}
