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
import { motion } from "framer-motion";
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

  const selectedNote = notes.find(n => n.id === selectedNoteId);

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
      date: "30 de jun.",
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
    <div className="flex h-[calc(100vh-40px)] bg-[#111111] text-[#e1e1e1] font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col border-r border-[#222222] bg-[#111111]">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-transparent rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:border-[#333333] transition-all placeholder:text-[#444444]"
            />
          </div>
          
          <button 
            onClick={handleCreateNote}
            className="flex items-center gap-2 text-sm text-[#888888] hover:text-white transition-colors pl-1"
          >
            <Plus size={16} />
            Nova nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-6 custom-scrollbar">
          {/* FIXADAS */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-[#444444] uppercase tracking-wider">
              Fixadas
            </div>
            <div className="space-y-0.5">
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
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold text-[#444444] uppercase tracking-wider">
              Pastas
              <button onClick={() => setIsCreatingFolder(true)} className="hover:text-white"><Plus size={12} /></button>
            </div>
            <div className="space-y-0.5">
              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="px-3 py-1 flex items-center gap-1">
                  <input 
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                    className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs outline-none"
                  />
                </form>
              )}
              {userFolders.map(folder => (
                <button 
                  key={folder}
                  onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${activeFolder === folder ? 'bg-[#222222] text-white' : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-[#cccccc]'}`}
                >
                  <ChevronRight size={12} className={`transition-transform ${activeFolder === folder ? 'rotate-90' : ''}`} />
                  <Folder size={14} />
                  {folder}
                </button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-[#444444] uppercase tracking-wider">
              Notas
            </div>
            <div className="space-y-0.5">
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
      <main className="flex-1 flex flex-col bg-[#111111]">
        {selectedNote ? (
          <>
            <header className="px-10 py-8 space-y-4">
              <div className="flex items-center justify-between">
                <input 
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote(selectedNote.id, "title", e.target.value)}
                  className="bg-transparent text-4xl font-bold text-white outline-none w-full"
                />
                <div className="flex items-center gap-4 text-[#888888]">
                  <button onClick={() => handleUpdateNote(selectedNote.id, "favorite", !selectedNote.favorite)} className={selectedNote.favorite ? "text-yellow-500" : "hover:text-white"}><Star size={20} /></button>
                  <button onClick={() => handleUpdateNote(selectedNote.id, "fixed", !selectedNote.fixed)} className={selectedNote.fixed ? "text-blue-500" : "hover:text-white"}><Pin size={20} /></button>
                  <button onClick={() => handleDeleteNote(selectedNote.id)} className="hover:text-red-500"><Trash2 size={20} /></button>
                  <button className="hover:text-white"><MoreVertical size={20} /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#666666]">
                <span className="flex items-center gap-1.5"><Clock size={12} /> {selectedNote.date}</span>
                <select 
                  value={selectedNote.folder}
                  onChange={(e) => handleUpdateNote(selectedNote.id, "folder", e.target.value)}
                  className="bg-transparent outline-none cursor-pointer border border-[#222222] rounded px-2 py-0.5 hover:border-[#333333]"
                >
                  <option value="Sem pasta">Sem pasta</option>
                  {userFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </header>

            <div className="px-10 py-2 border-y border-[#1a1a1a] flex items-center gap-6 text-[#666666]">
              <div className="flex items-center gap-4">
                <button className="hover:text-white"><Bold size={16} /></button>
                <button className="hover:text-white"><Italic size={16} /></button>
                <button className="hover:text-white"><Underline size={16} /></button>
              </div>
              <div className="w-px h-4 bg-[#222222]" />
              <div className="flex items-center gap-4">
                <button className="hover:text-white"><Heading1 size={16} /></button>
                <button className="hover:text-white"><List size={16} /></button>
                <button className="hover:text-white"><CheckSquare size={16} /></button>
              </div>
              <div className="w-px h-4 bg-[#222222]" />
              <div className="flex items-center gap-4">
                <button className="hover:text-white"><Quote size={16} /></button>
                <button className="hover:text-white"><Code size={16} /></button>
              </div>
            </div>

            <div className="flex-1 px-10 py-8 overflow-y-auto custom-scrollbar">
              <textarea 
                className="w-full h-full bg-transparent text-[#cccccc] text-lg leading-relaxed resize-none outline-none placeholder-[#333333]"
                placeholder="Escreva algo incrível..."
                value={selectedNote.content}
                onChange={(e) => handleUpdateNote(selectedNote.id, "content", e.target.value)}
              />
            </div>

            <footer className="px-10 py-3 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] text-[#444444] uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-900"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Salvo automaticamente</span>
              </div>
              <div className="flex items-center gap-4">
                <span>{selectedNote.content.split(/\s+/).filter(Boolean).length} palavras</span>
                <span>{selectedNote.content.length} caracteres</span>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#333333]">
            <p className="text-sm font-bold uppercase tracking-widest">Selecione uma nota</p>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteItem({ note, isSelected, onClick }: { note: any, isSelected: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all group ${isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#161616]'}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2 truncate">
          {note.title.startsWith("🚀") || note.title.startsWith("📚") || note.title.startsWith("💻") || note.title.startsWith("🍎") ? (
            <span className="text-sm">{note.title.split(' ')[0]}</span>
          ) : (
            <FileText size={14} className="text-[#444444]" />
          )}
          <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-[#888888] group-hover:text-[#cccccc]'}`}>
            {note.title.includes(' ') && (note.title.startsWith("🚀") || note.title.startsWith("📚") || note.title.startsWith("💻") || note.title.startsWith("🍎")) ? note.title.split(' ').slice(1).join(' ') : note.title}
          </h3>
        </div>
        {note.fixed && <Pin size={12} className="text-[#444444] mt-0.5" />}
      </div>
      <p className="text-[11px] text-[#444444] line-clamp-1 mb-1 leading-relaxed">
        {note.preview}
      </p>
      <div className="flex items-center gap-2 text-[9px] font-bold text-[#333333] uppercase">
        <span>{note.date}</span>
        <span>•</span>
        <span>{note.folder}</span>
      </div>
    </button>
  );
}
