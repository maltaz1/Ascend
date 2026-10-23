// Sugestões e respostas da Oração, copiadas de client/src/pages/Prayer.tsx.
// No web as "respostas da IA" também são modelos prontos escolhidos ao acaso.
import { supabase } from "@/lib/supabase";

export const PRAYER_SUGGESTIONS = [
 { emoji: '🙏', title: 'Gratidão', prompt: 'Ajude-me a expressar gratidão pelos bênçãos da minha vida' },
 { emoji: '💪', title: 'Força', prompt: 'Preciso de força para enfrentar os desafios de hoje' },
 { emoji: '☮', title: 'Paz', prompt: 'Busco paz interior e tranquilidade' },
 { emoji: '💚', title: 'Amor', prompt: 'Ajude-me a cultivar mais amor e compaixão' },
 { emoji: '🧭', title: 'Propósito', prompt: 'Gostaria de entender melhor meu propósito de vida' },
 { emoji: '🕊', title: 'Perdão', prompt: 'Preciso aprender a perdoar e deixar ir' },
];

// Enhanced AI prayer response generator with more complete responses
export function generatePrayerResponse(userMessage: string): string {
 const responses = [
 `Que reflexão profunda. Deixe-me ajudá-lo com uma oração e orientação:

Sua intenção de ${userMessage.toLowerCase()} é um passo importante em sua jornada espiritual. Reconhecer o que buscamos é o primeiro passo para transformação.

 ORAÇÃO:
"Senhor, abro meu coração para ${userMessage.toLowerCase()}. Ajude-me a encontrar paz, força e clareza nesta jornada. Que cada passo que dou seja guiado pela sabedoria e pelo amor. Que eu possa ser um instrumento de luz e esperança. Amém."

 REFLEXÃO:
Lembre-se que a mudança começa dentro de você. Cada dia é uma oportunidade de crescimento e renovação. Permita-se ser vulnerável e aberto às bênçãos que o universo tem a oferecer.`,
 
 `Sua intenção é muito significativa e merece atenção genuína. Vejo em suas palavras um desejo sincero de transformação e crescimento.

 ORAÇÃO:
"Que eu possa encontrar força e clareza em ${userMessage.toLowerCase()}. Que meu coração seja preenchido com esperança, minha mente com sabedoria e meu espírito com paz. Que eu caminhe com fé e confiança, sabendo que sou guiado por uma força maior. Amém."

 REFLEXÃO:
O caminho espiritual não é linear. Haverá momentos de luz e momentos de sombra, mas cada um deles contribui para sua evolução. Seja gentil consigo mesmo neste processo. A paciência e a compaixão são virtudes sagradas.`,
 
 `Que momento especial para refletir. Sua abertura em compartilhar isso comigo é um sinal de coragem e disposição para crescer.

 ORAÇÃO:
"Abro meu ser completamente para ${userMessage.toLowerCase()}. Que eu possa receber as bênçãos que me aguardam e compartilhá-las generosamente com outros. Que meu caminho seja iluminado pela verdade, meu coração seja tocado pela compaixão, e minha alma seja elevada pela graça divina. Amém."

 REFLEXÃO:
Cada intenção que plantamos em nosso coração é uma semente de transformação. Cultive-a com fé, regue-a com ações conscientes, e verá florescer em sua vida. Você é mais forte do que imagina.`,
 
 `Uma intenção linda e profunda. Vejo em você uma alma buscando conexão e significado. Isso é sagrado.

 ORAÇÃO:
"Que ${userMessage.toLowerCase()} seja parte do meu crescimento espiritual e transformação pessoal. Que eu permita que a graça flua através de mim, tocando não apenas minha vida, mas também a vida daqueles ao meu redor. Que meu coração permaneça aberto, minha mente receptiva e meu espírito sempre conectado ao divino. Amém."

 REFLEXÃO:
A vida é um presente precioso. Cada dia nos oferece a oportunidade de amar mais profundamente, servir com mais compaixão e viver com mais autenticidade. Você está no caminho certo.`,

 `Sua busca por ${userMessage.toLowerCase()} revela uma alma sensível e consciente. Honro sua jornada.

 ORAÇÃO:
"Que eu encontre em ${userMessage.toLowerCase()} a paz que transcende toda compreensão. Que minha fé seja fortalecida, minha esperança renovada e meu propósito esclarecido. Que eu seja um instrumento de amor e luz, espalhando bondade e compreensão por onde eu passar. Amém."

 REFLEXÃO:
A verdadeira transformação acontece quando nos permitimos ser vulneráveis e honestos com nós mesmos. Você está criando espaço para a graça atuar em sua vida. Continue nesta jornada com confiança e amor-próprio.`,

 `Que privilégio poder acompanhá-lo neste momento de busca e reflexão. Sua intenção toca meu coração.

 ORAÇÃO:
"Que ${userMessage.toLowerCase()} seja a ponte entre quem sou e quem desejo ser. Que eu tenha coragem para enfrentar meus medos, sabedoria para tomar boas decisões e compaixão para comigo mesmo durante este processo. Que a luz divina ilumine meu caminho. Amém."

 REFLEXÃO:
Você não está sozinho nesta jornada. Há uma força maior que o sustenta e guia. Confie no processo, celebre os pequenos avanços e lembre-se que cada dia é uma nova oportunidade de crescimento e renovação.`,
 ];
 
 return responses[Math.floor(Math.random() * responses.length)];
}

export type FavoritePrayer = { id: string; content: string; added_at: string };

export async function loadFavoritePrayers(): Promise<FavoritePrayer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("favorite_prayers")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });
  return !error && data ? (data as FavoritePrayer[]) : [];
}

export async function addFavoritePrayer(content: string): Promise<FavoritePrayer | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("favorite_prayers")
    .insert({ user_id: user.id, content, added_at: new Date().toISOString() })
    .select()
    .single();
  return !error && data ? (data as FavoritePrayer) : null;
}

export async function removeFavoritePrayer(id: string): Promise<void> {
  await supabase.from("favorite_prayers").delete().eq("id", id);
}
