import React, { useState, useRef, useEffect } from "react";
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
  Trash2,
  ChevronLeft,
  X as CloseIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "@/components/ui/FlowToast";
import 'react-quill-new/dist/quill.snow.css';

// Importação dinâmica do ReactQuill para evitar erros de SSR/Vite
const ReactQuill = React.lazy(() => import('react-quill-new'));

const mockNotes = [
  { 
    id: 1, 
    title: "Ideias para o Ascend v2", 
    preview: "Implementar sistema de notas com suporte a Markdown...", 
    date: "22 jun", 
    favorite: true, 
    fixed: true, 
    folder: "Ideias",
    content: "<h1>Ideias para o Ascend v2</h1><p>Implementar sistema de notas com suporte a Markdown, links bidirecionais e visualização em grafo.</p>"
  },
  { 
    id: 2, 
    title: "Refatoração do Webhook", 
    preview: "Validação de assinatura no formato JSON do Cakto...", 
    date: "20 jun", 
    favorite: false, 
    fixed: true, 
    folder: "Trabalho",
    content: "<p>Garantir que a validação de assinatura suporte o formato JSON do Cakto.</p>"
  },
  { 
    id: 3, 
    title: "Reunião com cliente", 
    preview: "Definição de escopo e prazos do projeto...", 
    date: "19 jun", 
    favorite: false, 
    fixed: false, 
    folder: "Trabalho",
    content: "<p>Definição de escopo e prazos do projeto.</p>"
  },
  { 
    id: 4, 
    title: "Objetivos da semana", 
    preview: "Finalizar UI de notas, testar deploy...", 
    date: "18 jun", 
    favorite: false, 
    fixed: false, 
    folder: "Pessoal",
    content: "<p>Finalizar UI de notas, testar deploy.</p>"
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
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(5);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [userFolders, setUserFolders] = useState<string[]>(["Trabalho", "Estudos", "Pessoal", "Ideias"]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const quillRef = useRef<any>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // Detecção de mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setViewMode('editor');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (isMobile) setViewMode('editor');
  };

  const handleUpdateNote = (id: number, field: string, value: any) => {
    setNotes(notes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleDeleteNote = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(newNotes.length > 0 ? newNotes[0].id : null);
        if (isMobile) setViewMode('list');
      }
      showToast("Nota excluída!", "success");
    }
  };

  const handleDeleteFolder = (folder: string) => {
    if (confirm(`Excluir a pasta "${folder}"? As notas desta pasta não serão excluídas.`)) {
      setUserFolders(userFolders.filter(f => f !== folder));
      setNotes(notes.map(n => n.folder === folder ? { ...n, folder: "Sem pasta" } : n));
      if (activeFolder === folder) setActiveFolder(null);
      showToast("Pasta removida!", "info");
    }
  };

  const executeCommand = (command: string, value?: any) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      if (command === 'list' || command === 'header' || command === 'blockquote' || command === 'code-block') {
        const format = editor.getFormat();
        if (format[command] === value) {
          editor.format(command, false);
        } else {
          editor.format(command, value);
        }
      } else {
        const format = editor.getFormat();
        editor.format(command, !format[command]);
      }
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeFolder || n.folder === activeFolder)
  );

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#0d0d12] lg:rounded-[32px] lg:border lg:border-white/5 overflow-hidden shadow-2xl notes-page-container relative">
      <style>{`
        .quill { height: 100%; display: flex; flex-direction: column; }
        .ql-container.ql-snow { border: none !important; flex: 1; font-family: inherit; }
        .ql-editor { font-size: 1.125rem; line-height: 1.8; color: #d1d5db; padding: 0 !important; }
        .ql-editor.ql-blank::before { color: #374151 !important; font-style: normal !important; left: 0 !important; }
        .ql-toolbar.ql-snow { display: none !important; }
        .notes-page-container select option { background-color: #16161e; color: white; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>

      {/* SIDEBAR (LISTA NO MOBILE) */}
      <aside className={`
        ${isMobile ? (viewMode === 'list' ? 'flex w-full' : 'hidden') : 'flex w-72'} 
        flex-col border-r border-white/5 bg-[#16161e]/40 backdrop-blur-xl
      `}>
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
          
          {!isMobile && (
            <button 
              onClick={handleCreateNote}
              className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors pl-2"
            >
              <Plus size={18} />
              Nova nota
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-24 space-y-8 custom-scrollbar">
          {/* FIXADAS */}
          {filteredNotes.some(n => n.fixed) && (
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
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      if (isMobile) setViewMode('editor');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

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
                <div key={folder} className="group flex items-center gap-1">
                  <button 
                    onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                    className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${activeFolder === folder ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={16} className={activeFolder === folder ? 'text-blue-400' : 'text-zinc-600'} />
                      {folder}
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${activeFolder === folder ? 'rotate-90 text-blue-400' : 'opacity-40'}`} />
                  </button>
                  <button 
                    onClick={() => handleDeleteFolder(folder)}
                    className={`${isMobile ? 'opacity-40' : 'opacity-0 group-hover:opacity-100'} p-2 text-zinc-700 hover:text-rose-500 transition-all`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    if (isMobile) setViewMode('editor');
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* EDITOR */}
      <main className={`
        ${isMobile ? (viewMode === 'editor' ? 'flex w-full' : 'hidden') : 'flex w-full'} 
        flex-1 flex flex-col bg-[#0d0d12]/60
      `}>
        {selectedNote ? (
          <>
            <header className="px-6 lg:px-10 py-6 lg:py-10 flex flex-col gap-4 lg:gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {isMobile && (
                    <button onClick={() => setViewMode('list')} className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors">
                      <ChevronLeft size={24} />
                    </button>
                  )}
                  <input 
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => handleUpdateNote(selectedNote.id, "title", e.target.value)}
                    className="bg-transparent text-2xl lg:text-5xl font-bold text-white outline-none w-full tracking-tight"
                  />
                </div>
                <div className="flex items-center gap-1 lg:gap-3">
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "favorite", !selectedNote.favorite)} 
                    icon={<Star size={isMobile ? 18 : 20} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />} 
                  />
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "fixed", !selectedNote.fixed)} 
                    icon={<Pin size={isMobile ? 18 : 20} className={selectedNote.fixed ? "fill-blue-500 text-blue-500" : ""} />} 
                  />
                  {!isMobile && <ToolbarButton onClick={() => handleDeleteNote(selectedNote.id)} icon={<Trash2 size={20} className="text-rose-500/70" />} />}
                  <ToolbarButton icon={<MoreVertical size={isMobile ? 18 : 20} />} />
                </div>
              </div>
              <div className="flex items-center gap-4 lg:gap-6 text-[10px] lg:text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2"><Clock size={14} className="text-blue-500/60" /> {selectedNote.date}</span>
                <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-2 lg:px-3 py-1 lg:py-1.5">
                  <Folder size={12} className="text-indigo-500/60" />
                  <select 
                    value={selectedNote.folder}
                    onChange={(e) => handleUpdateNote(selectedNote.id, "folder", e.target.value)}
                    className="bg-transparent outline-none cursor-pointer hover:text-zinc-300 transition-colors max-w-[80px] lg:max-w-none truncate"
                  >
                    <option value="Sem pasta">Sem pasta</option>
                    {userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                {isMobile && (
                  <button onClick={() => handleDeleteNote(selectedNote.id)} className="ml-auto text-rose-500/60">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </header>

            <div className="px-6 lg:px-10 py-3 lg:py-4 border-y border-white/5 flex items-center gap-4 lg:gap-8 text-zinc-600 bg-black/20 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-4 lg:gap-5 flex-shrink-0">
                <FormatButton onClick={() => executeCommand('bold')} icon={<Bold size={18} />} />
                <FormatButton onClick={() => executeCommand('italic')} icon={<Italic size={18} />} />
                <FormatButton onClick={() => executeCommand('underline')} icon={<Underline size={18} />} />
              </div>
              <div className="w-px h-6 bg-white/5 flex-shrink-0" />
              <div className="flex items-center gap-4 lg:gap-5 flex-shrink-0">
                <FormatButton onClick={() => executeCommand('header', 1)} icon={<Heading1 size={18} />} />
                <FormatButton onClick={() => executeCommand('list', 'bullet')} icon={<List size={18} />} />
                <FormatButton onClick={() => executeCommand('list', 'unchecked')} icon={<CheckSquare size={18} />} />
              </div>
              <div className="w-px h-6 bg-white/5 flex-shrink-0" />
              <div className="flex items-center gap-4 lg:gap-5 flex-shrink-0">
                <FormatButton onClick={() => executeCommand('blockquote')} icon={<Quote size={18} />} />
                <FormatButton onClick={() => executeCommand('code-block')} icon={<Code size={18} />} />
              </div>
            </div>

            <div className="flex-1 px-6 lg:px-10 py-6 lg:py-10 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto h-full">
                <React.Suspense fallback={<div className="text-zinc-800 animate-pulse">Carregando editor...</div>}>
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow"
                    value={selectedNote.content}
                    onChange={(content) => handleUpdateNote(selectedNote.id, "content", content)}
                    placeholder="Escreva algo incrível..."
                    modules={{ toolbar: false }}
                  />
                </React.Suspense>
              </div>
            </div>

            <footer className="px-6 lg:px-10 py-4 border-t border-white/5 flex items-center justify-between text-[9px] lg:text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] bg-black/40">
              <div className="flex items-center gap-4 lg:gap-6">
                <span className="flex items-center gap-2 text-emerald-500/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> 
                  {!isMobile && "Salvo automaticamente"}
                </span>
              </div>
              <div className="flex items-center gap-4 lg:gap-8">
                <span>{selectedNote.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} pal.</span>
                {!isMobile && <span>{selectedNote.content.replace(/<[^>]*>/g, '').length} caracteres</span>}
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

      {/* BOTÃO FLUTUANTE (FAB) NO MOBILE */}
      {isMobile && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCreateNote}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-900/40 flex items-center justify-center z-50"
        >
          <Plus size={28} />
        </motion.button>
      )}
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

function ToolbarButton({ icon, tooltip, onClick }: { icon: React.ReactNode, tooltip?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-2 lg:p-2.5 rounded-2xl text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90" 
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
      className="p-2 lg:p-2.5 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-all active:scale-90" 
      title={tooltip}
    >
      {icon}
    </button>
  );
}
