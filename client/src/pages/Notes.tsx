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
import { motion } from "framer-motion";

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

export default function Notes() {
  const [selectedNoteId, setSelectedNoteId] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [userFolders, setUserFolders] = useState<string[]>(["Trabalho", "Estudos", "Pessoal", "Ideias"]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const selectedNote = mockNotes.find(n => n.id === selectedNoteId) || mockNotes[0];

  const filteredNotes = mockNotes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeFolder || n.folder === activeFolder)
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      setUserFolders([...userFolders, newFolderName.trim()]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#0d0d12] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
      {/* SIDEBAR DE NOTAS */}
      <aside className="w-80 border-r border-white/5 flex flex-col bg-[#16161e]/40 backdrop-blur-xl">
        <div className="p-6 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-blue-500/30 focus:bg-black/60 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
            <Plus size={20} />
            Nova Nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-8 custom-scrollbar">
          {/* SEÇÕES FIXAS */}
          <div>
            <div className="px-4 mb-3 flex items-center gap-2 text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              <Pin size={12} className="text-blue-500/60" /> Fixadas
            </div>
            <div className="space-y-1.5">
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

          {/* PASTAS DINÂMICAS */}
          <div>
            <div className="px-4 mb-3 flex items-center justify-between text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <Folder size={12} className="text-indigo-500/60" /> Pastas
              </div>
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="hover:text-blue-400 transition-colors p-1"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1 px-1">
                {isCreatingFolder && (
                  <motion.form 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreateFolder}
                    className="px-3 py-2 mb-2"
                  >
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Nome da pasta..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                      className="w-full bg-black/60 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-white outline-none"
                    />
                  </motion.form>
                )}

              {userFolders.map(folder => (
                <button 
                  key={folder}
                  onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${activeFolder === folder ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <Folder size={16} className={activeFolder === folder ? 'text-blue-400' : 'text-zinc-600'} />
                    {folder}
                  </div>
                  <ChevronRight size={14} className={`transition-transform duration-300 ${activeFolder === folder ? 'rotate-90' : 'opacity-40'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* TODAS AS NOTAS */}
          <div>
            <div className="px-4 mb-3 flex items-center gap-2 text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              <FileText size={12} className="text-zinc-500" /> Notas
            </div>
            <div className="space-y-1.5">
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
      <main className="flex-1 flex flex-col bg-[#0d0d12]/60">
        {/* HEADER DA NOTA */}
        <header className="px-8 py-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">{selectedNote.title}</h2>
              <div className="flex items-center gap-1.5">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5 text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Clock size={12} className="text-blue-500/60" /> {selectedNote.date}</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500/60" /> Editado hoje às 14:30</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ToolbarButton icon={<Star size={20} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />} tooltip="Favoritar" />
            <ToolbarButton icon={<Pin size={20} className={selectedNote.fixed ? "fill-blue-500 text-blue-500" : ""} />} tooltip="Fixar" />
            <div className="w-px h-8 bg-white/5 mx-2" />
            <ToolbarButton icon={<MoreVertical size={20} />} tooltip="Mais opções" />
          </div>
        </header>

        {/* TOOLBAR DE FORMATAÇÃO */}
        <div className="px-8 py-3 border-b border-white/5 flex items-center gap-1 bg-black/20">
          <FormatButton icon={<Bold size={18} />} />
          <FormatButton icon={<Italic size={18} />} />
          <FormatButton icon={<Underline size={18} />} />
          <div className="w-px h-5 bg-white/10 mx-3" />
          <FormatButton icon={<Heading1 size={18} />} />
          <FormatButton icon={<List size={18} />} />
          <FormatButton icon={<ListOrdered size={18} />} />
          <FormatButton icon={<CheckSquare size={18} />} />
          <div className="w-px h-5 bg-white/10 mx-3" />
          <FormatButton icon={<Quote size={18} />} />
          <FormatButton icon={<Code size={18} />} />
          <div className="w-px h-5 bg-white/10 mx-3" />
          <FormatButton icon={<Palette size={18} />} tooltip="Cor da nota" />
          <FormatButton icon={<Copy size={18} />} tooltip="Duplicar" />
          <FormatButton icon={<History size={18} />} tooltip="Histórico" />
          <FormatButton icon={<Tag size={18} />} tooltip="Tags" />
        </div>

        {/* EDITOR */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-gradient-to-b from-transparent to-blue-500/[0.02]">
          <div className="max-w-4xl mx-auto">
            <textarea 
              className="w-full h-full bg-transparent text-zinc-300 text-xl leading-[1.8] resize-none outline-none placeholder-zinc-800 font-medium selection:bg-blue-500/30"
              placeholder="Comece a escrever sua ideia brilhante..."
              defaultValue={selectedNote.content}
            />
          </div>
        </div>

        {/* RODAPÉ */}
        <footer className="px-8 py-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] bg-black/40">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-emerald-500/70"><CheckCircle2 size={12} /> Sincronizado</span>
            <span>Editado há 5 min</span>
          </div>
          <div className="flex items-center gap-6">
            <span>128 palavras</span>
            <span>842 caracteres</span>
            <span>2 min leitura</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NoteItem({ note, isSelected, onClick }: { note: any, isSelected: boolean, onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl transition-all group relative border ${isSelected ? 'bg-blue-600/10 border-blue-500/30 shadow-2xl shadow-blue-900/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-bold text-[15px] truncate pr-6 tracking-tight ${isSelected ? 'text-blue-400' : 'text-zinc-200 group-hover:text-white'}`}>
          {note.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
          {note.fixed && <Pin size={12} className="text-blue-500 fill-blue-500/40" />}
          {note.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500/40" />}
        </div>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed font-medium">
        {note.preview}
      </p>
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{note.date}</span>
        <span className="text-[9px] font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-tighter">{note.folder}</span>
      </div>
      {isSelected && (
        <motion.div 
          layoutId="activeNoteGlow"
          className="absolute inset-0 bg-blue-500/5 rounded-2xl pointer-events-none blur-xl"
        />
      )}
    </motion.button>
  );
}

function ToolbarButton({ icon, tooltip }: { icon: React.ReactNode, tooltip: string }) {
  return (
    <button className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 hover:border-white/10 border border-transparent transition-all active:scale-90" title={tooltip}>
      {icon}
    </button>
  );
}

function FormatButton({ icon, tooltip }: { icon: React.ReactNode, tooltip?: string }) {
  return (
    <button className="p-2 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-all active:scale-90" title={tooltip}>
      {icon}
    </button>
  );
}
