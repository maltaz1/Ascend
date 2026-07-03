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
  CheckSquare, 
  Quote, 
  Code, 
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  Trash2,
  Check,
  X as CloseIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "@/components/ui/FlowToast";

const mockNotes = [
  { 
    id: 1, 
    title: "Ideias para o Ascend v2", 
    preview: "Implementar sistema de notas com suporte a Markdown...", 
    date: "22 jun", 
    favorite: true, 
    fixed: true, 
    folder: "Ideias",
    content: "Implementar sistema de notas com suporte a Markdown, links bidirecionais e visualização em grafo."
  },
  { 
    id: 2, 
    title: "Refatoração do Webhook", 
    preview: "Validação de assinatura no formato JSON do Cakto...", 
    date: "20 jun", 
    favorite: false, 
    fixed: true, 
    folder: "Trabalho",
    content: "Garantir que a validação de assinatura suporte o formato JSON do Cakto."
  },
  { 
    id: 3, 
    title: "Reunião com cliente", 
    preview: "Definição de escopo e prazos do projeto...", 
    date: "19 jun", 
    favorite: false, 
    fixed: false, 
    folder: "Trabalho",
    content: "Definição de escopo e prazos do projeto."
  },
  { 
    id: 4, 
    title: "Objetivos da semana", 
    preview: "Finalizar UI de notas, testar deploy...", 
    date: "18 jun", 
    favorite: false, 
    fixed: false, 
    folder: "Pessoal",
    content: "Finalizar UI de notas, testar deploy."
  },
  { 
    id: 5, 
    title: "No", 
    preview: "Escreva algo incrível...", 
    date: "30 de jun.", 
    favorite: false, 
    fixed: false, 
    folder: "Sem pasta",
    content: ""
  }
];

export default function Notes() {
  const [notes, setNotes] = useState(mockNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(5);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [userFolders, setUserFolders] = useState<string[]>(["Trabalho", "Estudos", "Pessoal", "Ideias"]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const applyFormat = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current || !selectedNote) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = selectedNote.content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newContent = before + prefix + selection + suffix + after;
    handleUpdateNote(selectedNote.id, "content", newContent);

    // Reposicionar cursor após o estado atualizar
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + prefix.length + selection.length + suffix.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeFolder || n.folder === activeFolder)
  );

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      if (userFolders.includes(newFolderName.trim())) {
        showToast("Esta pasta já existe!", "info");
        return;
      }
      setUserFolders([...userFolders, newFolderName.trim()]);
      setNewFolderName("");
      setIsCreatingFolder(false);
      showToast("Pasta criada!", "success");
    }
  };

  const handleCreateNote = () => {
    const newNote = {
      id: Date.now(),
      title: "Nova nota",
      preview: "Escreva algo incrível...",
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toLowerCase(),
      favorite: false,
      fixed: false,
      folder: activeFolder || "Sem pasta",
      content: ""
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (id: number, field: string, value: any) => {
    setNotes(notes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleDeleteNote = (id: number) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (selectedNoteId === id && newNotes.length > 0) {
      setSelectedNoteId(newNotes[0].id);
    } else if (newNotes.length === 0) {
      setSelectedNoteId(-1);
    }
    showToast("Nota excluída!", "success");
  };

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#0d0d12] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col border-r border-white/5 bg-[#16161e]/40 backdrop-blur-xl">
        <div className="p-5 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500/30 focus:bg-black/60 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <button 
            onClick={handleCreateNote}
            className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors pl-2"
          >
            <Plus size={18} />
            Nova nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-8 custom-scrollbar">
          {/* FIXADAS */}
          <div>
            <div className="px-4 mb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Fixadas
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
            <div className="px-4 mb-3 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Pastas
              <button onClick={() => setIsCreatingFolder(true)} className="hover:text-white p-1 transition-colors"><Plus size={14} /></button>
            </div>
            <div className="space-y-0.5 px-1">
              <AnimatePresence>
                {isCreatingFolder && (
                  <motion.form 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreateFolder} 
                    className="px-3 py-2 mb-2 bg-black/40 rounded-xl border border-blue-500/20 flex items-center gap-2"
                  >
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Nome..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                      className="flex-1 bg-transparent text-xs text-white outline-none"
                    />
                  </motion.form>
                )}
              </AnimatePresence>
              {userFolders.map(folder => (
                <button 
                  key={folder}
                  onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${activeFolder === folder ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'}`}
                >
                  <ChevronRight size={14} className={`transition-transform duration-300 ${activeFolder === folder ? 'rotate-90 text-blue-400' : 'opacity-40'}`} />
                  <Folder size={16} className={activeFolder === folder ? 'text-blue-400' : 'text-zinc-600'} />
                  {folder}
                </button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <div className="px-4 mb-3 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Notas
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

      {/* EDITOR */}
      <main className="flex-1 flex flex-col bg-[#0d0d12]/60">
        {selectedNote ? (
          <>
            <header className="px-10 py-10 flex flex-col gap-6">
              <div className="flex items-center justify-between gap-6">
                <input 
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote(selectedNote.id, "title", e.target.value)}
                  className="bg-transparent text-5xl font-bold text-white outline-none w-full tracking-tight"
                />
                <div className="flex items-center gap-3">
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "favorite", !selectedNote.favorite)} 
                    icon={<Star size={20} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />} 
                    tooltip="Favoritar" 
                  />
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "fixed", !selectedNote.fixed)} 
                    icon={<Pin size={20} className={selectedNote.fixed ? "fill-blue-500 text-blue-500" : ""} />} 
                    tooltip="Fixar" 
                  />
                  <ToolbarButton onClick={() => handleDeleteNote(selectedNote.id)} icon={<Trash2 size={20} className="text-rose-500/70" />} tooltip="Excluir" />
                  <ToolbarButton icon={<MoreVertical size={20} />} tooltip="Mais" />
                </div>
              </div>
              <div className="flex items-center gap-6 text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2"><Clock size={14} className="text-blue-500/60" /> {selectedNote.date}</span>
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
                  <Folder size={12} className="text-indigo-500/60" />
                  <select 
                    value={selectedNote.folder}
                    onChange={(e) => handleUpdateNote(selectedNote.id, "folder", e.target.value)}
                    className="bg-transparent outline-none cursor-pointer hover:text-zinc-300 transition-colors"
                  >
                    <option value="Sem pasta">Sem pasta</option>
                    {userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </header>

            <div className="px-10 py-4 border-y border-white/5 flex items-center gap-8 text-zinc-600 bg-black/20">
              <div className="flex items-center gap-5">
                <FormatButton onClick={() => applyFormat("**", "**")} icon={<Bold size={18} />} tooltip="Negrito" />
                <FormatButton onClick={() => applyFormat("_", "_")} icon={<Italic size={18} />} tooltip="Itálico" />
                <FormatButton onClick={() => applyFormat("<u>", "</u>")} icon={<Underline size={18} />} tooltip="Sublinhado" />
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex items-center gap-5">
                <FormatButton onClick={() => applyFormat("# ", "")} icon={<Heading1 size={18} />} tooltip="Título" />
                <FormatButton onClick={() => applyFormat("- ", "")} icon={<List size={18} />} tooltip="Lista" />
                <FormatButton onClick={() => applyFormat("- [ ] ", "")} icon={<CheckSquare size={18} />} tooltip="Checklist" />
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex items-center gap-5">
                <FormatButton onClick={() => applyFormat("> ", "")} icon={<Quote size={18} />} tooltip="Citação" />
                <FormatButton onClick={() => applyFormat("`", "`")} icon={<Code size={18} />} tooltip="Código" />
              </div>
            </div>

            <div className="flex-1 px-10 py-10 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto h-full">
                <textarea 
                  ref={textareaRef}
                  className="w-full h-full bg-transparent text-zinc-300 text-xl leading-relaxed resize-none outline-none placeholder-zinc-800 font-medium selection:bg-blue-500/30"
                  placeholder="Escreva algo incrível..."
                  value={selectedNote.content}
                  onChange={(e) => handleUpdateNote(selectedNote.id, "content", e.target.value)}
                />
              </div>
            </div>

            <footer className="px-10 py-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] bg-black/40">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-emerald-500/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> 
                  Salvo automaticamente
                </span>
              </div>
              <div className="flex items-center gap-8">
                <span>{selectedNote.content.split(/\s+/).filter(Boolean).length} palavras</span>
                <span>{selectedNote.content.length} caracteres</span>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 gap-4">
            <FileText size={64} className="opacity-5" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-20">Selecione uma nota</p>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteItem({ note, isSelected, onClick }: { note: any, isSelected: boolean, onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl transition-all group relative border ${isSelected ? 'bg-blue-600/10 border-blue-500/20 shadow-xl shadow-blue-900/10' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/5'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 truncate">
          <FileText size={14} className={isSelected ? 'text-blue-400' : 'text-zinc-700 group-hover:text-zinc-500'} />
          <h3 className={`font-bold text-[15px] truncate tracking-tight ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
            {note.title}
          </h3>
        </div>
        {note.fixed && <Pin size={12} className="text-blue-500/60 mt-0.5" />}
      </div>
      <p className="text-xs text-zinc-600 line-clamp-1 mb-3 leading-relaxed font-medium pl-6">
        {note.preview}
      </p>
      <div className="flex items-center justify-between pl-6">
        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{note.date}</span>
        <span className="text-[9px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 uppercase tracking-tighter">{note.folder}</span>
      </div>
    </motion.button>
  );
}

function ToolbarButton({ icon, tooltip, onClick }: { icon: React.ReactNode, tooltip: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 rounded-2xl text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90" 
      title={tooltip}
    >
      {icon}
    </button>
  );
}

function FormatButton({ icon, tooltip, onClick }: { icon: React.ReactNode, tooltip?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-all active:scale-90" 
      title={tooltip}
    >
      {icon}
    </button>
  );
}
