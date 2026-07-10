import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  Trash2,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "@/components/ui/FlowToast";
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/notes";
import { getFolders, createFolder, deleteFolder } from "@/lib/noteFolders";
import type { NoteDatabaseRow, NoteFolderDatabaseRow } from "@/lib/database/types";
import 'react-quill-new/dist/quill.snow.css';

// Importação dinâmica do ReactQuill para evitar erros de SSR/Vite
const ReactQuill = React.lazy(() => import('react-quill-new'));

// Utilitários (memoizados para evitar recriação)
const generatePreview = (htmlContent: string): string => {
  return htmlContent.replace(/<[^>]*>/g, '').slice(0, 120);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'ontem';
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toLowerCase();
};

interface NoteUI extends NoteDatabaseRow {
  folder: string;
}

interface SyncState {
  status: 'idle' | 'typing' | 'saving' | 'synced';
  lastSyncTime?: Date;
}

interface DialogState {
  open: boolean;
  id: string | null;
}

export default function Notes() {
  // Estados de dados
  const [notes, setNotes] = useState<NoteUI[]>([]);
  const [userFolders, setUserFolders] = useState<NoteFolderDatabaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de UI
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});

  // Estados de sincronização
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });

  // Estados de diálogos (consolidados)
  const [deleteNoteDialog, setDeleteNoteDialog] = useState<DialogState>({ open: false, id: null });
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<DialogState>({ open: false, id: null });

  // Refs
  const quillRef = useRef<any>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const isMountedRef = useRef(true);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Carregar dados iniciais (apenas uma vez)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [notesData, foldersData] = await Promise.all([
          getNotes(),
          getFolders(),
        ]);

        if (!isMountedRef.current) return;

        // Mapear notas com folder como string
        const mappedNotes: NoteUI[] = notesData.map(note => ({
          ...note,
          folder: note.folder_id ? (foldersData.find(f => f.id === note.folder_id)?.name || "Sem pasta") : "Sem pasta",
        }));

        setNotes(mappedNotes);
        setUserFolders(foldersData);

        // Selecionar a primeira nota se houver
        if (mappedNotes.length > 0) {
          setSelectedNoteId(mappedNotes[0].id);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar notas", "error");
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, []);

  // Detecção de mobile (com cleanup)
  useEffect(() => {
    const checkMobile = () => {
      if (!isMountedRef.current) return;
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setViewMode('editor');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Autosave com debounce (otimizado para evitar race conditions)
  const scheduleAutosave = useCallback(() => {
    if (!selectedNote || !isMountedRef.current) return;

    setSyncState({ status: 'typing' });

    // Limpar timeout anterior
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || !selectedNote) return;

      const currentContent = selectedNote.content;
      
      // Evitar salvar se o conteúdo não mudou
      if (currentContent === lastSavedContentRef.current) {
        if (isMountedRef.current) {
          setSyncState({ status: 'synced', lastSyncTime: new Date() });
        }
        return;
      }

      try {
        if (isMountedRef.current) {
          setSyncState({ status: 'saving' });
        }

        await updateNote(selectedNote.id, {
          content: currentContent,
        });

        if (!isMountedRef.current) return;

        lastSavedContentRef.current = currentContent;
        setSyncState({ status: 'synced', lastSyncTime: new Date() });
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Erro ao salvar nota:", error);
        setSyncState({ status: 'idle' });
        showToast("Erro ao salvar nota", "error");
      }
    }, 800);
  }, [selectedNote]);

  // Handlers memoizados
  const handleCreateFolder = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const existingFolder = userFolders.find(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
      if (existingFolder) {
        showToast("Esta pasta já existe!", "info");
        return;
      }

      const newFolder = await createFolder({ name: newFolderName.trim() });
      if (newFolder && isMountedRef.current) {
        setUserFolders(prev => [...prev, newFolder]);
        setNewFolderName("");
        setIsCreatingFolder(false);
        showToast("Pasta criada!", "success");
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Erro ao criar pasta:", error);
      showToast("Erro ao criar pasta", "error");
    }
  }, [newFolderName, userFolders]);

  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await createNote({
        title: "Nova nota",
        content: "",
        favorite: false,
        fixed: false,
        folder_id: activeFolder ? userFolders.find(f => f.name === activeFolder)?.id || null : null,
      });

      if (newNote && isMountedRef.current) {
        const noteUI: NoteUI = {
          ...newNote,
          folder: activeFolder || "Sem pasta",
        };
        setNotes(prev => [noteUI, ...prev]);
        setSelectedNoteId(newNote.id);
        if (isMobile) setViewMode('editor');
        lastSavedContentRef.current = "";
        showToast("Nota criada!", "success");
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Erro ao criar nota:", error);
      showToast("Erro ao criar nota", "error");
    }
  }, [activeFolder, userFolders, isMobile]);

  const handleUpdateNote = useCallback(async (id: string, field: string, value: any) => {
    // Atualizar estado localmente
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));

    if (field === 'content') {
      scheduleAutosave();
    } else {
      // Salvar imediatamente para outros campos
      try {
        await updateNote(id, { [field]: value });
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Erro ao atualizar nota:", error);
        showToast("Erro ao atualizar nota", "error");
      }
    }
  }, [scheduleAutosave]);

  const handleDeleteNote = useCallback((id: string) => {
    setDeleteNoteDialog({ open: true, id });
  }, []);

  const confirmDeleteNote = useCallback(async () => {
    if (!deleteNoteDialog.id) return;

    try {
      await deleteNote(deleteNoteDialog.id);
      
      if (!isMountedRef.current) return;

      const newNotes = notes.filter(n => n.id !== deleteNoteDialog.id);
      setNotes(newNotes);

      if (selectedNoteId === deleteNoteDialog.id) {
        setSelectedNoteId(newNotes.length > 0 ? newNotes[0].id : null);
        if (isMobile) setViewMode('list');
      }

      showToast("Nota excluída!", "success");
      setDeleteNoteDialog({ open: false, id: null });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Erro ao excluir nota:", error);
      showToast("Erro ao excluir nota", "error");
    }
  }, [deleteNoteDialog.id, notes, selectedNoteId, isMobile]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setDeleteFolderDialog({ open: true, id: folderId });
  }, []);

  const confirmDeleteFolder = useCallback(async () => {
    if (!deleteFolderDialog.id) return;

    try {
      const folderToDelete = userFolders.find(f => f.id === deleteFolderDialog.id);
      if (!folderToDelete) return;

      await deleteFolder(deleteFolderDialog.id);
      
      if (!isMountedRef.current) return;

      setUserFolders(prev => prev.filter(f => f.id !== deleteFolderDialog.id));

      // Mover notas da pasta excluída para "Sem pasta"
      setNotes(prev => prev.map(n => 
        n.folder_id === deleteFolderDialog.id 
          ? { ...n, folder_id: null, folder: "Sem pasta" } 
          : n
      ));

      if (activeFolder === folderToDelete.name) {
        setActiveFolder(null);
      }

      showToast("Pasta removida!", "info");
      setDeleteFolderDialog({ open: false, id: null });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Erro ao excluir pasta:", error);
      showToast("Erro ao excluir pasta", "error");
    }
  }, [deleteFolderDialog.id, userFolders, activeFolder]);

  const executeCommand = useCallback((command: string, value?: any) => {
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
      setTimeout(() => {
        if (isMountedRef.current) {
          setActiveFormats(editor.getFormat());
        }
      }, 50);
    }
  }, []);

  // Memoizar notas filtradas
  const filteredNotes = useMemo(() => 
    notes.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) &&
      (!activeFolder || n.folder === activeFolder)
    ),
    [notes, search, activeFolder]
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-40px)] bg-[#0d0d12] lg:rounded-[32px] lg:border lg:border-white/5 overflow-hidden shadow-2xl items-center justify-center">
        <div className="text-zinc-600">Carregando notas...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-40px)] bg-[#0d0d12] lg:rounded-[32px] lg:border lg:border-white/5 overflow-hidden shadow-2xl notes-page-container relative">
      <style>{`
        .quill { height: 100%; display: flex; flex-direction: column; }
        .ql-container.ql-snow { border: none !important; flex: 1; font-family: inherit; }
        .ql-editor { font-size: 1.125rem; line-height: 1.8; color: #d1d5db; padding: 0 !important; }
        .ql-editor.ql-blank::before { 
          color: #27272a !important; 
          font-style: normal !important; 
          left: 0 !important;
          content: 'Digite / para comandos...' !important;
        }
        .ql-toolbar.ql-snow { display: none !important; }
        .notes-page-container select option { background-color: #16161e; color: white; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* SIDEBAR (LISTA NO MOBILE) */}
      <aside className={`
        ${isMobile ? (viewMode === 'list' ? 'flex w-full' : 'hidden') : 'flex w-80'} 
        flex-col border-r border-white/5 bg-[#16161e]/40 backdrop-blur-xl
      `}>
        <div className="p-6 space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500/30 focus:bg-black/60 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          {!isMobile && (
            <button 
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              <Plus size={18} />
              Nova nota
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-8 custom-scrollbar">
          {/* FIXADAS */}
          {filteredNotes.some(n => n.fixed) && (
            <div>
              <div className="px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Pin size={10} className="text-blue-500/50" />
                Fixadas
              </div>
              <div className="space-y-2">
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
            <div className="px-4 mb-4 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Pastas
              <button onClick={() => setIsCreatingFolder(true)} className="hover:text-white p-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Plus size={14} /></button>
            </div>
            <div className="space-y-1 px-1">
              <AnimatePresence>
                {isCreatingFolder && (
                  <motion.form 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleCreateFolder} 
                    className="px-4 py-3 mb-3 bg-black/40 rounded-2xl border border-blue-500/20 flex items-center gap-2"
                  >
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Nome da pasta..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                      className="flex-1 bg-transparent text-sm text-white outline-none"
                    />
                  </motion.form>
                )}
              </AnimatePresence>
              {userFolders.map(folder => (
                <div key={folder.id} className="group flex items-center gap-1">
                  <button 
                    onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeFolder === folder.name ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={16} className={activeFolder === folder.name ? 'text-blue-400' : 'text-zinc-600'} />
                      {folder.name}
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${activeFolder === folder.name ? 'rotate-90 text-blue-400' : 'opacity-40'}`} />
                  </button>
                  <FolderMenu onDelete={() => handleDeleteFolder(folder.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <div className="px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Notas
            </div>
            <div className="space-y-2">
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
        flex-1 flex flex-col bg-[#0d0d12]/60 relative
      `}>
        {selectedNote ? (
          <>
            <header className="px-6 lg:px-12 py-8 lg:py-12 flex flex-col gap-6 lg:gap-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  {/* Recuo no mobile para não bater no hamburguer */}
                  <div className={`${isMobile ? "pl-12" : ""} flex-1`}>
                    <input 
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) => handleUpdateNote(selectedNote.id, "title", e.target.value)}
                      className="bg-transparent text-3xl lg:text-5xl font-black text-white outline-none w-full tracking-tight"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                  {!isMobile && (
                    <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest mr-4">
                      {selectedNote.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} PALAVRAS
                    </div>
                  )}
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "favorite", !selectedNote.favorite)} 
                    icon={<Star size={isMobile ? 20 : 22} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />} 
                  />
                  <ToolbarButton 
                    onClick={() => handleUpdateNote(selectedNote.id, "fixed", !selectedNote.fixed)} 
                    icon={<Pin size={isMobile ? 20 : 22} className={selectedNote.fixed ? "fill-blue-500 text-blue-500" : ""} />} 
                  />
                  <ToolbarButton 
                    icon={<MoreVertical size={isMobile ? 20 : 22} />} 
                    menuItems={[
                      { label: 'Excluir Nota', icon: <Trash2 size={14} />, onClick: () => handleDeleteNote(selectedNote.id), danger: true }
                    ]}
                  />
                </div>
              </div>

              {/* SELETOR DE PASTA */}
              <div className="flex items-center gap-3">
                <Folder size={16} className="text-zinc-600" />
                <select 
                  value={selectedNote.folder_id || ""}
                  onChange={(e) => {
                    const folderId = e.target.value || null;
                    const folderName = folderId ? userFolders.find(f => f.id === folderId)?.name || "Sem pasta" : "Sem pasta";
                    handleUpdateNote(selectedNote.id, "folder_id", folderId);
                    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, folder_id: folderId, folder: folderName } : n));
                  }}
                  className="bg-black/40 border border-white/5 rounded-2xl px-4 py-2 text-sm text-white focus:border-blue-500/30 outline-none transition-all"
                >
                  <option value="">Sem pasta</option>
                  {userFolders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
            </header>

            {/* EDITOR DE CONTEÚDO */}
            <div className="flex-1 overflow-hidden px-6 lg:px-12 py-8">
              <React.Suspense fallback={<div className="text-zinc-600">Carregando editor...</div>}>
                <ReactQuill
                  ref={quillRef}
                  value={selectedNote.content}
                  onChange={(content) => handleUpdateNote(selectedNote.id, "content", content)}
                  theme="snow"
                  modules={{ toolbar: false }}
                  readOnly={false}
                />
              </React.Suspense>
            </div>

            {/* TOOLBAR DE FORMATAÇÃO */}
            <div className="px-6 lg:px-12 py-6 border-t border-white/5 flex items-center gap-2 bg-black/40 flex-wrap">
              <FormatButton icon={<Bold size={18} />} tooltip="Negrito" onClick={() => executeCommand('bold')} active={activeFormats.bold} />
              <FormatButton icon={<Italic size={18} />} tooltip="Itálico" onClick={() => executeCommand('italic')} active={activeFormats.italic} />
              <FormatButton icon={<Underline size={18} />} tooltip="Sublinhado" onClick={() => executeCommand('underline')} active={activeFormats.underline} />
              <div className="w-px h-6 bg-white/10 mx-2" />
              <FormatButton icon={<Heading1 size={18} />} tooltip="Título" onClick={() => executeCommand('header', 1)} active={activeFormats.header === 1} />
              <FormatButton icon={<List size={18} />} tooltip="Lista" onClick={() => executeCommand('list', 'ordered')} active={activeFormats.list === 'ordered'} />
              <FormatButton icon={<CheckSquare size={18} />} tooltip="Checklist" onClick={() => executeCommand('list', 'bullet')} active={activeFormats.list === 'bullet'} />
              <FormatButton icon={<Quote size={18} />} tooltip="Citação" onClick={() => executeCommand('blockquote')} active={activeFormats.blockquote} />
              <FormatButton icon={<Code size={18} />} tooltip="Código" onClick={() => executeCommand('code-block')} active={activeFormats['code-block']} />
            </div>

            {/* RODAPÉ E NAVEGAÇÃO MOBILE */}
            <AnimatePresence>
              {isMobile && viewMode === 'editor' && (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none"
                >
                  <button 
                    onClick={() => setViewMode('list')}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-2xl shadow-blue-900/40 active:scale-95 transition-all pointer-events-auto"
                  >
                    <ChevronLeft size={20} />
                    VOLTAR PARA LISTA
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isMobile && (
              <footer className="px-12 py-5 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] bg-black/40">
                <div className="flex items-center gap-6">
                  <span className={`flex items-center gap-2 transition-colors ${
                    syncState.status === 'synced' ? 'text-emerald-500/60' :
                    syncState.status === 'saving' ? 'text-yellow-500/60' :
                    syncState.status === 'typing' ? 'text-blue-500/60' :
                    'text-zinc-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px] transition-colors ${
                      syncState.status === 'synced' ? 'bg-emerald-500 shadow-emerald-500' :
                      syncState.status === 'saving' ? 'bg-yellow-500 shadow-yellow-500' :
                      syncState.status === 'typing' ? 'bg-blue-500 shadow-blue-500' :
                      'bg-zinc-600'
                    }`} /> 
                    {syncState.status === 'synced' ? 'Sincronizado' :
                     syncState.status === 'saving' ? 'Salvando...' :
                     syncState.status === 'typing' ? 'Digitando...' :
                     'Ocioso'}
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <span>{selectedNote.content.replace(/<[^>]*>/g, '').length} caracteres</span>
                </div>
              </footer>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 gap-4">
            <FileText size={64} className="opacity-5" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-20">Selecione uma nota</p>
          </div>
        )}
      </main>

      {/* BOTÃO FLUTUANTE (FAB) NO MOBILE - SÓ NA LISTA */}
      {isMobile && viewMode === 'list' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCreateNote}
          className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-900/40 flex items-center justify-center z-50 border-4 border-[#0d0d12]"
        >
          <Plus size={32} />
        </motion.button>
      )}

      {/* DIÁLOGOS DE CONFIRMAÇÃO */}
      <ConfirmDialog
        open={deleteNoteDialog.open}
        onOpenChange={(open) => setDeleteNoteDialog({ ...deleteNoteDialog, open })}
        title="Excluir nota?"
        description="Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteNote}
      />

      <ConfirmDialog
        open={deleteFolderDialog.open}
        onOpenChange={(open) => setDeleteFolderDialog({ ...deleteFolderDialog, open })}
        title="Excluir pasta?"
        description={`Tem certeza que deseja excluir a pasta? As notas desta pasta serão movidas para "Sem pasta".`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteFolder}
      />
    </div>
  );
}

// Componentes memoizados para evitar re-renders desnecessários
const NoteItem = React.memo(function NoteItem({ note, isSelected, onClick }: { note: NoteUI, isSelected: boolean, onClick: () => void }) {
  const getTagStyle = useCallback((folder: string) => {
    const colors: Record<string, string> = {
      "Trabalho": "bg-red-500/10 text-red-400/80 border-red-500/10",
      "Estudos": "bg-purple-500/10 text-purple-400/80 border-purple-500/10",
      "Pessoal": "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/10",
      "Ideias": "bg-blue-500/10 text-blue-400/80 border-blue-500/10",
      "Sem pasta": "bg-zinc-500/10 text-zinc-500/80 border-zinc-500/10"
    };
    return colors[folder] || colors["Sem pasta"];
  }, []);

  const preview = useMemo(() => generatePreview(note.content) || "Escreva algo incrível...", [note.content]);

  return (
    <motion.button 
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl transition-all group relative border ${isSelected ? 'bg-[#1a1a24] border-white/5 shadow-2xl' : 'bg-[#12121a] border-white/5 hover:bg-[#16161e] hover:border-white/10'}`}
    >
      {/* Barra lateral de seleção curva e fosca */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl" />
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 truncate">
          <h3 className={`font-black text-[16px] truncate tracking-tight ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
            {note.title}
          </h3>
        </div>
        {note.fixed && <Pin size={12} className="text-blue-500 fill-blue-500/20 mt-1 flex-shrink-0" />}
      </div>
      <p className="text-sm text-zinc-500 line-clamp-1 mb-4 leading-relaxed font-medium">
        {preview}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{formatDate(note.updated_at)}</span>
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tight ${getTagStyle(note.folder)}`}>
          {note.folder}
        </span>
      </div>
    </motion.button>
  );
});

const ToolbarButton = React.memo(function ToolbarButton({ icon, tooltip, onClick, menuItems }: { icon: React.ReactNode, tooltip?: string, onClick?: () => void, menuItems?: any[] }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => menuItems ? setShowMenu(!showMenu) : onClick?.()}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90" 
        title={tooltip}
      >
        {icon}
      </button>
      {showMenu && menuItems && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl py-2 z-50">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { item.onClick(); setShowMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${item.danger ? 'text-rose-500 hover:bg-rose-500/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const FormatButton = React.memo(function FormatButton({ icon, tooltip, onClick, active }: { icon: React.ReactNode, tooltip?: string, onClick?: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all active:scale-90 ${active ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-600 hover:text-zinc-200 hover:bg-white/5'}`} 
      title={tooltip}
    >
      {icon}
    </button>
  );
});

const FolderMenu = React.memo(function FolderMenu({ onDelete }: { onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-700 hover:text-white transition-all"
      >
        <MoreVertical size={14} />
      </button>
      {showMenu && (
        <div className="absolute left-full ml-2 top-0 w-40 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl py-2 z-50">
          <button
            onClick={() => { onDelete(); setShowMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Excluir Pasta
          </button>
        </div>
      )}
    </div>
  );
});
