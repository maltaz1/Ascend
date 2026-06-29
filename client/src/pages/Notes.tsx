import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  Pin, 
  Star, 
  Folder, 
  MoreVertical, 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Tag, 
  Copy, 
  History, 
  Palette,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mockNotes = [
  { 
    id: 1, 
    title: "🚀 Ideias para o Ascend v2", 
    preview: "Implementar sistema de notas com suporte a Markdown, links bidirecionais e visualização em grafo...", 
    date: "22 Jun", 
    favorite: true, 
    fixed: true, 
    folder: "Ideias",
    tags: ["roadmap", "design"],
    content: "O objetivo da v2 é tornar o Ascend o hub definitivo de produtividade.\n\n### Principais recursos:\n- **Notas com Markdown**: Editor rico e intuitivo.\n- **Links bidirecionais**: Conecte suas ideias utilizando [[Nome da Nota]].\n- **Templates**: Padrões prontos para reuniões, estudos e diário.\n\n> 'A melhor maneira de prever o futuro é criá-lo.' - Peter Drucker"
  },
  { 
    id: 2, 
    title: "📚 Resumo: Atomic Habits", 
    preview: "Pequenas mudanças, resultados impressionantes. O sistema é mais importante que as metas...", 
    date: "21 Jun", 
    favorite: true, 
    fixed: false, 
    folder: "Estudos",
    tags: ["livros", "hábitos"],
    content: "Resumo do livro Atomic Habits de James Clear.\n\n1. 1% melhor a cada dia.\n2. Esqueça as metas, foque nos sistemas.\n3. Construa a identidade do que você quer se tornar."
  },
  { 
    id: 3, 
    title: "💻 Refatoração do Webhook", 
    preview: "Garantir que a validação de assinatura suporte o formato JSON do Cakto...", 
    date: "20 Jun", 
    favorite: false, 
    fixed: true, 
    folder: "Trabalho",
    tags: ["backend", "segurança"],
    content: "Checklist de refatoração:\n- [x] Validar segredo\n- [ ] Testar idempotência\n- [ ] Adicionar logs detalhados"
  },
  { id: 4, title: "🍎 Plano de Dieta", preview: "Café da manhã: Ovos e abacate. Almoço: Frango e salada...", date: "19 Jun", favorite: false, fixed: false, folder: "Pessoal", tags: ["saúde"], content: "Segunda a Sexta:\n- 08:00: Ovos e abacate\n- 12:00: Frango e salada\n- 19:00: Peixe e legumes" },
  { id: 5, title: "💡 Nova Meta: Maratona", preview: "Treinamento para os 42km. Início em Agosto...", date: "18 Jun", favorite: false, fixed: false, folder: "Ideias", tags: ["esporte"], content: "Cronograma de treinos..." },
  { id: 6, title: "📝 Reunião de Alinhamento", preview: "Discutir os prazos da sprint atual e blockers...", date: "17 Jun", favorite: false, fixed: false, folder: "Trabalho", tags: ["reunião"], content: "Anotações da reunião..." },
  { id: 7, title: "🏠 Reforma da Sala", preview: "Orçamentos para pintura e troca do piso...", date: "16 Jun", favorite: false, fixed: false, folder: "Pessoal", tags: ["casa"], content: "Pintura: R$ 2.000\nPiso: R$ 5.000" },
  { id: 8, title: "📖 Estudo de React Server Components", preview: "Entender a diferença entre Client e Server components...", date: "15 Jun", favorite: false, fixed: false, folder: "Estudos", tags: ["tech"], content: "RSC permite renderizar no servidor..." },
  { id: 9, title: "🎨 Identidade Visual Ascend", preview: "Cores primárias: #3B82F6, #0D0E1C...", date: "14 Jun", favorite: false, fixed: false, folder: "Trabalho", tags: ["design"], content: "Paleta de cores..." },
  { id: 10, title: "🍿 Filmes para Assistir", preview: "Duna Parte 2, Oppenheimer, Interestelar...", date: "13 Jun", favorite: false, fixed: false, folder: "Pessoal", tags: ["lazer"], content: "Lista de filmes..." },
];

const folders = ["Trabalho", "Estudos", "Pessoal", "Ideias"];

export default function Notes() {
  const [selectedNoteId, setSelectedNoteId] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const selectedNote = mockNotes.find(n => n.id === selectedNoteId) || mockNotes[0];

  const filteredNotes = mockNotes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeFolder || n.folder === activeFolder)
  );

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#0D0E1C] rounded-3xl border border-zinc-800/50 overflow-hidden">
      {/* SIDEBAR DE NOTAS */}
      <aside className="w-80 border-r border-zinc-800/50 flex flex-col bg-zinc-900/20">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
          
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/10">
            <Plus size={18} />
            Nova Nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-6 custom-scrollbar">
          {/* SEÇÕES FIXAS */}
          <div>
            <div className="px-3 mb-2 flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              <Pin size={12} /> Fixadas
            </div>
            <div className="space-y-1">
              {filteredNotes.filter(n => n.fixed).map(note => (
                <NoteItem 
                  key={note.id} 
                  note={note} 
                  isSelected={selectedNoteId === note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                />
              ))}
            </div>
          </div>

          {/* PASTAS */}
          <div>
            <div className="px-3 mb-2 flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              <Folder size={12} /> Pastas
            </div>
            <div className="space-y-1">
              {folders.map(folder => (
                <button 
                  key={folder}
                  onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${activeFolder === folder ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={14} className={activeFolder === folder ? 'text-blue-400' : 'text-zinc-500'} />
                    {folder}
                  </div>
                  <ChevronRight size={12} className={`transition-transform ${activeFolder === folder ? 'rotate-90' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* TODAS AS NOTAS */}
          <div>
            <div className="px-3 mb-2 flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              <FileText size={12} /> Todas as Notas
            </div>
            <div className="space-y-1">
              {filteredNotes.filter(n => !n.fixed).map(note => (
                <NoteItem 
                  key={note.id} 
                  note={note} 
                  isSelected={selectedNoteId === note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-zinc-950/20">
        {/* HEADER DA NOTA */}
        <header className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/10 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">{selectedNote.title}</h2>
              <div className="flex items-center gap-1">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Criada em {selectedNote.date}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Última edição hoje às 14:30</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToolbarButton icon={<Star size={18} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />} tooltip="Favoritar" />
            <ToolbarButton icon={<Pin size={18} className={selectedNote.fixed ? "fill-blue-500 text-blue-500" : ""} />} tooltip="Fixar" />
            <div className="w-px h-6 bg-zinc-800 mx-1" />
            <ToolbarButton icon={<MoreVertical size={18} />} tooltip="Mais opções" />
          </div>
        </header>

        {/* TOOLBAR DE FORMATAÇÃO */}
        <div className="px-6 py-2 border-b border-zinc-800/30 flex items-center gap-1 bg-zinc-900/5">
          <FormatButton icon={<Bold size={16} />} />
          <FormatButton icon={<Italic size={16} />} />
          <FormatButton icon={<Underline size={16} />} />
          <div className="w-px h-4 bg-zinc-800 mx-2" />
          <FormatButton icon={<Heading1 size={16} />} />
          <FormatButton icon={<List size={16} />} />
          <FormatButton icon={<ListOrdered size={16} />} />
          <FormatButton icon={<CheckSquare size={16} />} />
          <div className="w-px h-4 bg-zinc-800 mx-2" />
          <FormatButton icon={<Quote size={16} />} />
          <FormatButton icon={<Code size={16} />} />
          <div className="w-px h-4 bg-zinc-800 mx-2" />
          <FormatButton icon={<Palette size={16} />} tooltip="Cor da nota" />
          <FormatButton icon={<Copy size={16} />} tooltip="Duplicar" />
          <FormatButton icon={<History size={16} />} tooltip="Histórico" />
          <FormatButton icon={<Tag size={16} />} tooltip="Tags" />
        </div>

        {/* EDITOR */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <textarea 
              className="w-full h-full bg-transparent text-zinc-200 text-lg leading-relaxed resize-none outline-none placeholder-zinc-700 font-medium"
              placeholder="Comece a escrever..."
              defaultValue={selectedNote.content}
            />
          </div>
        </div>

        {/* RODAPÉ */}
        <footer className="px-6 py-3 border-t border-zinc-800/50 flex items-center justify-between text-[11px] text-zinc-500 font-medium bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-500/80"><CheckCircle2 size={12} /> Tudo salvo</span>
            <span>Última edição há 5 min</span>
          </div>
          <div className="flex items-center gap-4">
            <span>128 palavras</span>
            <span>842 caracteres</span>
            <span>2 min de leitura</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NoteItem({ note, isSelected, onClick }: { note: any, isSelected: boolean, onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-2xl transition-all group relative ${isSelected ? 'bg-blue-600/10 border border-blue-500/20 shadow-lg shadow-blue-600/5' : 'hover:bg-zinc-800/40 border border-transparent'}`}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className={`font-bold text-sm truncate pr-4 ${isSelected ? 'text-blue-400' : 'text-zinc-200 group-hover:text-white'}`}>
          {note.title}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {note.fixed && <Pin size={10} className="text-blue-500 fill-blue-500" />}
          {note.favorite && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
        </div>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
        {note.preview}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{note.date}</span>
        <span className="text-[10px] font-bold text-zinc-600 uppercase bg-zinc-800/50 px-1.5 py-0.5 rounded-md">{note.folder}</span>
      </div>
      {isSelected && (
        <motion.div 
          layoutId="activeNote"
          className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-full"
        />
      )}
    </motion.button>
  );
}

function ToolbarButton({ icon, tooltip }: { icon: React.ReactNode, tooltip: string }) {
  return (
    <button className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all" title={tooltip}>
      {icon}
    </button>
  );
}

function FormatButton({ icon, tooltip }: { icon: React.ReactNode, tooltip?: string }) {
  return (
    <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all" title={tooltip}>
      {icon}
    </button>
  );
}
