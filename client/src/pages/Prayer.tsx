// Oração — Carbon Amber Industrial Premium
// Chat com IA para ajudar em orações e reflexões espirituais

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Sparkles, RotateCcw, Heart, BookOpen } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { showToast } from '@/components/ui/FlowToast';
import { supabase } from '@/lib/supabase';

const PRAYER_SUGGESTIONS = [
  { emoji: '🙏', title: 'Gratidão', prompt: 'Ajude-me a expressar gratidão pelos bênçãos da minha vida' },
  { emoji: '💪', title: 'Força', prompt: 'Preciso de força para enfrentar os desafios de hoje' },
  { emoji: '🕊️', title: 'Paz', prompt: 'Busco paz interior e tranquilidade' },
  { emoji: '❤️', title: 'Amor', prompt: 'Ajude-me a cultivar mais amor e compaixão' },
  { emoji: '🌟', title: 'Propósito', prompt: 'Gostaria de entender melhor meu propósito de vida' },
  { emoji: '🤝', title: 'Perdão', prompt: 'Preciso aprender a perdoar e deixar ir' },
];

// Enhanced AI prayer response generator with more complete responses
function generatePrayerResponse(userMessage: string): string {
  const responses = [
    `Que reflexão profunda. Deixe-me ajudá-lo com uma oração e orientação:

Sua intenção de ${userMessage.toLowerCase()} é um passo importante em sua jornada espiritual. Reconhecer o que buscamos é o primeiro passo para transformação.

✨ ORAÇÃO:
"Senhor, abro meu coração para ${userMessage.toLowerCase()}. Ajude-me a encontrar paz, força e clareza nesta jornada. Que cada passo que dou seja guiado pela sabedoria e pelo amor. Que eu possa ser um instrumento de luz e esperança. Amém."

💭 REFLEXÃO:
Lembre-se que a mudança começa dentro de você. Cada dia é uma oportunidade de crescimento e renovação. Permita-se ser vulnerável e aberto às bênçãos que o universo tem a oferecer.`,
    
    `Sua intenção é muito significativa e merece atenção genuína. Vejo em suas palavras um desejo sincero de transformação e crescimento.

✨ ORAÇÃO:
"Que eu possa encontrar força e clareza em ${userMessage.toLowerCase()}. Que meu coração seja preenchido com esperança, minha mente com sabedoria e meu espírito com paz. Que eu caminhe com fé e confiança, sabendo que sou guiado por uma força maior. Amém."

💭 REFLEXÃO:
O caminho espiritual não é linear. Haverá momentos de luz e momentos de sombra, mas cada um deles contribui para sua evolução. Seja gentil consigo mesmo neste processo. A paciência e a compaixão são virtudes sagradas.`,
    
    `Que momento especial para refletir. Sua abertura em compartilhar isso comigo é um sinal de coragem e disposição para crescer.

✨ ORAÇÃO:
"Abro meu ser completamente para ${userMessage.toLowerCase()}. Que eu possa receber as bênçãos que me aguardam e compartilhá-las generosamente com outros. Que meu caminho seja iluminado pela verdade, meu coração seja tocado pela compaixão, e minha alma seja elevada pela graça divina. Amém."

💭 REFLEXÃO:
Cada intenção que plantamos em nosso coração é uma semente de transformação. Cultive-a com fé, regue-a com ações conscientes, e verá florescer em sua vida. Você é mais forte do que imagina.`,
    
    `Uma intenção linda e profunda. Vejo em você uma alma buscando conexão e significado. Isso é sagrado.

✨ ORAÇÃO:
"Que ${userMessage.toLowerCase()} seja parte do meu crescimento espiritual e transformação pessoal. Que eu permita que a graça flua através de mim, tocando não apenas minha vida, mas também a vida daqueles ao meu redor. Que meu coração permaneça aberto, minha mente receptiva e meu espírito sempre conectado ao divino. Amém."

💭 REFLEXÃO:
A vida é um presente precioso. Cada dia nos oferece a oportunidade de amar mais profundamente, servir com mais compaixão e viver com mais autenticidade. Você está no caminho certo.`,

    `Sua busca por ${userMessage.toLowerCase()} revela uma alma sensível e consciente. Honro sua jornada.

✨ ORAÇÃO:
"Que eu encontre em ${userMessage.toLowerCase()} a paz que transcende toda compreensão. Que minha fé seja fortalecida, minha esperança renovada e meu propósito esclarecido. Que eu seja um instrumento de amor e luz, espalhando bondade e compreensão por onde eu passar. Amém."

💭 REFLEXÃO:
A verdadeira transformação acontece quando nos permitimos ser vulneráveis e honestos com nós mesmos. Você está criando espaço para a graça atuar em sua vida. Continue nesta jornada com confiança e amor-próprio.`,

    `Que privilégio poder acompanhá-lo neste momento de busca e reflexão. Sua intenção toca meu coração.

✨ ORAÇÃO:
"Que ${userMessage.toLowerCase()} seja a ponte entre quem sou e quem desejo ser. Que eu tenha coragem para enfrentar meus medos, sabedoria para tomar boas decisões e compaixão para comigo mesmo durante este processo. Que a luz divina ilumine meu caminho. Amém."

💭 REFLEXÃO:
Você não está sozinho nesta jornada. Há uma força maior que o sustenta e guia. Confie no processo, celebre os pequenos avanços e lembre-se que cada dia é uma nova oportunidade de crescimento e renovação.`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

type ViewMode = 'chat' | 'favorites';

export default function Prayer() {
  const [favoritePrayers, setFavoritePrayers] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  loadFavorites();
}, []);

const loadFavorites = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from('favorite_prayers')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (!error && data) {
    setFavoritePrayers(data);
  }
};


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string = inputValue) => {
  if (!message.trim()) return;

  setInputValue('');
  setIsLoading(true);

  const userMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
  };

  setMessages(prev => [...prev, userMessage]);

  await new Promise(resolve => setTimeout(resolve, 1200));

  const aiResponse = generatePrayerResponse(message);

  const assistantMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: aiResponse,
  };

  setMessages(prev => [...prev, assistantMessage]);

  setIsLoading(false);
};

  const handleSuggestion = (suggestion: typeof PRAYER_SUGGESTIONS[0]) => {
    handleSendMessage(suggestion.prompt);
  };

  const handleClearChat = () => {
    setMessages([]);
    showToast('Chat limpo', 'info', '🧹');
  };

  const handleToggleFavorite = async (content: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const existing = favoritePrayers.find(
    p => p.content === content
  );

  if (existing) {
    await supabase
      .from('favorite_prayers')
      .delete()
      .eq('id', existing.id);

    setFavoritePrayers(prev =>
      prev.filter(p => p.id !== existing.id)
    );

    showToast('Removido dos favoritos', 'info', '💔');
  } else {
    const { data, error } = await supabase
      .from('favorite_prayers')
      .insert({
        user_id: user.id,
        content,
        added_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setFavoritePrayers(prev => [data, ...prev]);
    }

    showToast('Adicionado aos favoritos', 'success', '❤️');
  }
};

  const handleRemoveFavorite = async (id: string) => {
  await supabase
    .from('favorite_prayers')
    .delete()
    .eq('id', id);

  setFavoritePrayers(prev =>
    prev.filter(p => p.id !== id)
  );

  showToast('Removido dos favoritos', 'info', '🗑️');
};
  

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 16 }}>
      {/* Header with tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontFamily: 'Space Grotesk',
              fontWeight: 800,
              fontSize: 28,
              color: 'var(--foreground)',
              marginBottom: 4,
            }}>
              🙏 Espaço de Oração
            </h1>
            <p style={{
              fontFamily: 'DM Sans',
              fontSize: 14,
              color: 'var(--muted-foreground)',
            }}>
              Compartilhe suas intenções e receba orientação espiritual
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('chat')}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: viewMode === 'chat' ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
              background: viewMode === 'chat' ? 'rgba(245,158,11,0.1)' : 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'chat') {
                e.currentTarget.style.background = 'rgba(245,158,11,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'chat') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            Chat
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: viewMode === 'favorites' ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
              background: viewMode === 'favorites' ? 'rgba(245,158,11,0.1)' : 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'favorites') {
                e.currentTarget.style.background = 'rgba(245,158,11,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'favorites') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Heart size={14} fill={viewMode === 'favorites' ? 'currentColor' : 'none'} />
            Favoritos ({favoritePrayers.length})
          </button>
        </div>
      </div>

      {/* Chat View */}
      {viewMode === 'chat' && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}>
            {messages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 24,
                textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
                  <h2 style={{
                    fontFamily: 'Space Grotesk',
                    fontWeight: 700,
                    fontSize: 18,
                    color: 'var(--foreground)',
                    marginBottom: 8,
                  }}>
                    Bem-vindo ao Espaço de Oração
                  </h2>
                  <p style={{
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    color: 'var(--muted-foreground)',
                  }}>
                    Comece digitando uma intenção ou escolha uma sugestão abaixo
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                  width: '100%',
                  maxWidth: 500,
                }}>
                  {PRAYER_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestion(suggestion)}
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        border: '1px solid rgba(245,158,11,0.2)',
                        background: 'rgba(245,158,11,0.06)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'DM Sans',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(245,158,11,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(245,158,11,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)';
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{suggestion.emoji}</span>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{suggestion.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 8,
                  }}
                >
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))'
                      : 'rgba(168,85,247,0.08)',
                    border: msg.role === 'user'
                      ? '1px solid rgba(245,158,11,0.2)'
                      : '1px solid rgba(168,85,247,0.2)',
                    color: 'var(--foreground)',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    position: 'relative',
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid rgba(168,85,247,0.2)',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#A855F7',
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          <Sparkles size={14} />
                          Orientação Espiritual
                        </div>
                        <button
                          onClick={() => handleToggleFavorite(msg.content)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: favoritePrayers.some(p => p.content === msg.content) ? '#3B82F6' : 'var(--muted-foreground)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#3B82F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = favoritePrayers.some(p => p.content === msg.content) ? '#3B82F6' : 'var(--muted-foreground)';
                          }}
                          title={favoritePrayers.some(p => p.content === msg.content) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <Heart size={16} fill={favoritePrayers.some(p => p.content === msg.content) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                gap: 8,
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>●</span>
                    <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite 0.2s' }}>●</span>
                    <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite 0.4s' }}>●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSendMessage();
                }
              }}
              placeholder="Compartilhe sua intenção de oração..."
              className="fz-input"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: 13,
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="fz-btn-primary"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} />
            </button>
            <button
              onClick={handleClearChat}
              className="fz-btn-ghost"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              title="Limpar chat"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </>
      )}

      {/* Favorites View */}
      {viewMode === 'favorites' && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px',
          background: 'var(--bg-secondary)',
          borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          {favoritePrayers.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 16,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48 }}>❤️</div>
              <h2 style={{
                fontFamily: 'Space Grotesk',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--foreground)',
                marginBottom: 8,
              }}>
                Nenhuma Oração Favoritada
              </h2>
              <p style={{
                fontFamily: 'DM Sans',
                fontSize: 13,
                color: 'var(--muted-foreground)',
              }}>
                Volte ao chat e clique no ícone de coração para adicionar orações aos favoritos
              </p>
            </div>
          ) : (
            favoritePrayers.map((prayer, idx) => (
              <div
                key={prayer.id}
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid rgba(245,158,11,0.2)',
                  background: 'rgba(245,158,11,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{
                    flex: 1,
                    color: 'var(--foreground)',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {prayer.content}
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(prayer.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#F59E0B',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Remover dos favoritos"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--muted-foreground)',
                  fontFamily: 'DM Sans',
                }}>
                  Adicionado em {new Date(prayer.added_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 500px"] {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)) !important;
          }
          div[style*="maxWidth: 75%"] {
            max-width: 85% !important;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
