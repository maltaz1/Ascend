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
// Geração de prévia otimizada com limpeza de entidades HTML
const generatePreview = (htmlContent: string | null | undefined): string => {
 if (!htmlContent || typeof htmlContent !== 'string') return '';
 // Remove tags HTML
 let text = htmlContent.replace(/<[^>]*>/g, '');
 // Remove entidades HTML comuns
 text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
 // Remove espaços múltiplos e quebras de linha
 text = text.replace(/\s+/g, ' ').trim();
 return text.slice(0, 120);
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

export default function Notes({ isPro, onOpenUpgrade }: { isPro?: boolean; onOpenUpgrade?: () => void }) {
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
 const notesRef = useRef<NoteUI[]>([]);
 const selectedNoteIdRef = useRef<string | null>(null);

 const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

 useEffect(() => {
 notesRef.current = notes;
 }, [notes]);

 useEffect(() => {
 selectedNoteIdRef.current = selectedNoteId;
 }, [selectedNoteId]);

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
 if (!isPro) {
 setIsLoading(false);
 return;
 }
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

 notesRef.current = mappedNotes;
 setNotes(mappedNotes);
 setUserFolders(foldersData);

 // Selecionar a primeira nota se houver
 if (mappedNotes.length > 0) {
 selectedNoteIdRef.current = mappedNotes[0].id;
 setSelectedNoteId(mappedNotes[0].id);
 lastSavedContentRef.current = mappedNotes[0].content;
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

 // Autosave com debounce. Recebe o snapshot mais recente para evitar estado defasado.
 const scheduleAutosave = useCallback((note: NoteUI) => {
 if (!isMountedRef.current) return;

 setSyncState({ status: 'typing' });

 if (autosaveTimeoutRef.current) {
 clearTimeout(autosaveTimeoutRef.current);
 }

 autosaveTimeoutRef.current = setTimeout(async () => {
 if (!isMountedRef.current) return;

 try {
 setSyncState({ status: 'saving' });
 await updateNote(note.id, {
 title: note.title,
 content: note.content,
 });

 if (!isMountedRef.current) return;
 lastSavedContentRef.current = note.content;
 setSyncState({ status: 'synced', lastSyncTime: new Date() });
 } catch (error) {
 if (!isMountedRef.current) return;
 console.error("Erro ao salvar nota:", error);
 setSyncState({ status: 'idle' });
 showToast("Erro ao salvar nota", "error");
 }
 }, 800);
 }, []);

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
 notesRef.current = [noteUI, ...notesRef.current];
 setNotes(notesRef.current);
 selectedNoteIdRef.current = newNote.id;
 setSelectedNoteId(newNote.id);
 if (isMobile) setViewMode('editor');
 lastSavedContentRef.current = newNote.content;
 showToast("Nota criada!", "success");
 }
 } catch (error) {
 if (!isMountedRef.current) return;
 console.error("Erro ao criar nota:", error);
 showToast("Erro ao criar nota", "error");
 }
 }, [activeFolder, userFolders, isMobile]);

 const handleUpdateNote = useCallback(async (id: string, field: string, value: any) => {
 const currentNote = notesRef.current.find(n => n.id === id);
 if (!currentNote) return;

 const updatedNote = { ...currentNote, [field]: value } as NoteUI;
 notesRef.current = notesRef.current.map(n => n.id === id ? updatedNote : n);
 setNotes(notesRef.current);

 if (field === 'content' || field === 'title') {
 scheduleAutosave(updatedNote);
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
 <div className="flex h-[calc(100vh-40px)] bg-[var(--ledger-paper-bg)] lg:rounded-[32px] lg:border lg:border-[var(--ledger-paper-border)] overflow-hidden items-center justify-center"><div className="text-[var(--ink-muted)]">Carregando notas...</div></div>
 );
 }

 if (!isPro) {
 return (
 <div className="flex h-[calc(100vh-40px)] bg-[var(--ledger-paper-bg)] lg:rounded-[8px] lg:border lg:border-[var(--ledger-paper-border)] overflow-hidden items-center justify-center p-6 text-center"><div className="max-w-md space-y-6"><div className="w-20 h-20 bg-[#ede9fe] rounded-md border border-purple-500/30 flex items-center justify-center mx-auto"><FileText className="text-[var(--primary)]" size={40} /></div><div className="space-y-2"><h2 className="text-2xl font-bold text-[var(--ink)]">Notas é um recurso Pro</h2><p className="text-[var(--ink-muted)]">
 Organize seus pensamentos, ideias e projetos com nosso sistema de notas completo. 
 Faça o upgrade para o Pro para desbloquear este recurso.
 </p></div><button
 onClick={onOpenUpgrade}
 className="px-8 py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-md font-semibold transition-all"
 >
 Assinar Pro Agora
 </button></div></div>
 );
 }

 return (
 <div className="flex h-[calc(100vh-40px)] bg-transparent lg:rounded-[8px] lg:border lg:border-[var(--ledger-paper-border)] overflow-hidden notes-page-container relative notebook-page"><style>{`
 .quill { height: 100%; display: flex; flex-direction: column; }
 .ql-container.ql-snow { border: none !important; flex: 1; font-family: inherit; }
 .ql-editor { font-size: 1.125rem; line-height: 1.8; color: var(--ink); padding: 0 !important; }
 .ql-editor.ql-blank::before { 
 color: var(--ink-muted) !important; 
 font-style: normal !important; 
 left: 0 !important;
 content: 'Digite / para comandos...' !important;
 }
 .ql-toolbar.ql-snow { display: none !important; }
 .notes-page-container select option { background-color: var(--ledger-paper-bg); color: var(--ink); }
 .custom-scrollbar::-webkit-scrollbar { width: 4px; }
 .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
 .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, rgba(0,0,0,0.15)); border-radius: 10px; }
 .no-scrollbar::-webkit-scrollbar { display: none; }
 `}</style>

 {/* SIDEBAR (LISTA NO MOBILE) */}
 <aside className={`
 ${isMobile ? (viewMode === 'list' ? 'flex w-full' : 'hidden') : 'flex w-80'} 
 flex-col border-r border-[var(--ledger-paper-border)] bg-[var(--ledger-paper-bg)]
 `}><div className="p-6 space-y-6"><div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={14} /><input 
 type="text" 
 placeholder="Pesquisar notas..." 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md pl-10 pr-4 py-3 text-sm text-[var(--ink)] focus:border-[var(--primary)] focus:bg-[var(--muted)] outline-none transition-all placeholder:text-[var(--ink-muted)]"
 /></div>
 
 {!isMobile && (
 <button 
 onClick={handleCreateNote}
 className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-md text-sm font-bold shadow-[4px_4px_0_rgba(0,0,0,0.3)] transition-all active:scale-[0.98]"
 ><Plus size={18} />
 Nova nota
 </button>
 )}
 </div><div className="flex-1 overflow-y-auto px-4 pb-24 space-y-8 custom-scrollbar">
 {/* FIXADAS */}
 {filteredNotes.some(n => n.fixed) && (
 <div><div className="px-4 mb-4 text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-[0.2em] flex items-center gap-2"><Pin size={10} className="text-[var(--accent)]/70" />
 Fixadas
 </div><div className="space-y-2">
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
 </div></div>
 )}

 {/* PASTAS */}
 <div><div className="px-4 mb-4 flex items-center justify-between text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-[0.2em]">
 Pastas
 <button onClick={() => setIsCreatingFolder(true)} className="hover:text-white p-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Plus size={14} /></button></div><div className="space-y-1 px-1"><AnimatePresence>
 {isCreatingFolder && (
 <motion.form 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 onSubmit={handleCreateFolder} 
 className="px-4 py-3 mb-3 bg-[#ede9fe] rounded-md border border-purple-500/30 flex items-center gap-2"
 ><input 
 autoFocus
 type="text"
 placeholder="Nome da pasta..."
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 onBlur={() => !newFolderName && setIsCreatingFolder(false)}
 className="flex-1 bg-transparent text-sm text-white outline-none"
 /></motion.form>
 )}
 </AnimatePresence>
 {userFolders.map(folder => (
 <div key={folder.id} className="group flex items-center gap-1"><button 
 onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
 className={`flex-1 flex items-center justify-between px-4 py-3 rounded-md text-sm font-bold transition-all ${activeFolder === folder.name ? 'bg-[#ede9fe] text-[#5b21b6] border border-purple-500/30' : 'text-[var(--ink-muted)] hover:bg-[var(--muted)] hover:text-[var(--ink)] border border-transparent'}`}
 ><div className="flex items-center gap-3"><Folder size={16} className={activeFolder === folder.name ? 'text-[var(--primary)]' : 'text-[var(--ink-muted)]'} />
 {folder.name}
 </div><ChevronRight size={14} className={`transition-transform duration-300 ${activeFolder === folder.name ? 'rotate-90 text-[var(--primary)]' : 'opacity-40'}`} /></button><FolderMenu onDelete={() => handleDeleteFolder(folder.id)} /></div>
 ))}
 </div></div>

 {/* NOTAS */}
 <div><div className="px-4 mb-4 text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-[0.2em]">
 Notas
 </div>
 {!isMobile && userFolders.length === 0 && filteredNotes.length === 0 && (
 <div className="text-center py-16 px-4"><div className="w-16 h-16 bg-[var(--ledger-paper-bg)] rounded-md border border-[var(--ledger-paper-border)] flex items-center justify-center mx-auto mb-4"><FileText size={28} className="text-[var(--ink-muted)]" /></div><p className="text-[var(--ink-muted)] text-sm font-medium mb-2">Nenhuma nota ainda</p><p className="text-[var(--ink-muted)] text-xs mb-4">Comece criando sua primeira nota para organizar seus pensamentos.</p><button 
 onClick={handleCreateNote}
 className="px-5 py-2.5 bg-[var(--primary-dark, var(--primary-dark, #7c3aed))] hover:bg-[#6d28d9] text-white rounded-md text-xs font-bold transition-all shadow-[4px_4px_0_rgba(0,0,0,0.3)]"
 >
 + Criar primeira nota
 </button></div>
 )}
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
 </div></div></div></aside>

 {/* EDITOR */}
 <main className={`
 ${isMobile ? (viewMode === 'editor' ? 'flex w-full' : 'hidden') : 'flex w-full'} 
 flex-1 flex flex-col bg-transparent relative notebook-page
 `}>
 {selectedNote ? (
 <><header className="notebook-sheet notebook-sheet--margined px-6 lg:px-12 py-6 lg:py-8 flex flex-col gap-4 lg:gap-5"><div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0">
 {/* Recuo no mobile para não bater no hamburguer */}
 <div className={`${isMobile ? "pl-12" : ""}`}><input 
 type="text"
 value={selectedNote.title}
 onChange={(e) => handleUpdateNote(selectedNote.id, "title", e.target.value)}
 className="bg-transparent text-xl lg:text-3xl font-black text-white outline-none w-full tracking-tight truncate"
 placeholder="Título da nota"
 /></div></div><div className="flex items-center gap-1 flex-shrink-0">
 {!isMobile && (
 <div className="text-[9px] font-bold text-[var(--ink-muted)] uppercase tracking-widest px-3 py-2 rounded-md bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)]">
 {selectedNote.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} palavras
 </div>
 )}
 <ToolbarButton 
 icon={<MoreVertical size={isMobile ? 18 : 20} />} 
 menuItems={[
 { label: 'Favoritar', icon: <Star size={14} className={selectedNote.favorite ? "fill-yellow-500 text-yellow-500" : ""} />, onClick: () => handleUpdateNote(selectedNote.id, "favorite", !selectedNote.favorite) },
 { label: 'Fixar', icon: <Pin size={14} className={selectedNote.fixed ? "fill-[var(--accent)] text-[var(--accent)]" : ""} />, onClick: () => handleUpdateNote(selectedNote.id, "fixed", !selectedNote.fixed) },
 { label: 'Excluir Nota', icon: <Trash2 size={14} />, onClick: () => handleDeleteNote(selectedNote.id), danger: true }
 ]}
 /></div></div>

 {/* SELETOR DE PASTA */}
 <div className="flex items-center gap-2"><select 
 value={selectedNote.folder_id || ""}
 onChange={(e) => {
 const folderId = e.target.value || null;
 const folderName = folderId ? userFolders.find(f => f.id === folderId)?.name || "Sem pasta" : "Sem pasta";
 handleUpdateNote(selectedNote.id, "folder_id", folderId);
 setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, folder_id: folderId, folder: folderName } : n));
 }}
 className="bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md px-3 py-2 text-xs font-bold text-[var(--ink)] hover:text-[var(--primary)] hover:border-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all cursor-pointer"
 > <option value="">📁 Sem pasta</option>
 {userFolders.map(folder => (
 <option key={folder.id} value={folder.id}>📁 {folder.name}</option>
 ))}
 </select></div></header>

 {/* EDITOR DE CONTEÚDO */}
 <div className="flex-1 overflow-hidden px-6 lg:px-12 py-8"><React.Suspense fallback={<div className="text-[var(--ink-muted)]">Carregando editor...</div>}><ReactQuill
 ref={quillRef}
 value={selectedNote.content}
 onChange={(content) => handleUpdateNote(selectedNote.id, "content", content)}
 theme="snow"
 modules={{ toolbar: false }}
 readOnly={false}
 /></React.Suspense></div>

 {/* TOOLBAR DE FORMATAÇÃO */}
 <div className="px-6 lg:px-12 py-6 border-t border-[var(--ledger-paper-border)] flex items-center gap-2 bg-[var(--ledger-paper-bg)] flex-wrap"><FormatButton icon={<Bold size={18} />} tooltip="Negrito" onClick={() => executeCommand('bold')} active={activeFormats.bold} /><FormatButton icon={<Italic size={18} />} tooltip="Itálico" onClick={() => executeCommand('italic')} active={activeFormats.italic} /><FormatButton icon={<Underline size={18} />} tooltip="Sublinhado" onClick={() => executeCommand('underline')} active={activeFormats.underline} /><div className="w-px h-6 bg-[var(--border)] mx-2" /><FormatButton icon={<Heading1 size={18} />} tooltip="Título" onClick={() => executeCommand('header', 1)} active={activeFormats.header === 1} /><FormatButton icon={<List size={18} />} tooltip="Lista" onClick={() => executeCommand('list', 'ordered')} active={activeFormats.list === 'ordered'} /><FormatButton icon={<CheckSquare size={18} />} tooltip="Checklist" onClick={() => executeCommand('list', 'bullet')} active={activeFormats.list === 'bullet'} /><FormatButton icon={<Quote size={18} />} tooltip="Citação" onClick={() => executeCommand('blockquote')} active={activeFormats.blockquote} /><FormatButton icon={<Code size={18} />} tooltip="Código" onClick={() => executeCommand('code-block')} active={activeFormats['code-block']} /></div>

 {/* RODAPÉ E NAVEGAÇÃO MOBILE */}
 <AnimatePresence>
 {isMobile && viewMode === 'editor' && (
 <motion.div 
 initial={{ y: 100 }}
 animate={{ y: 0 }}
 exit={{ y: 100 }}
 className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-[var(--ledger-paper-bg)] pointer-events-none"
 ><button 
 onClick={() => setViewMode('list')}
 className="w-full flex items-center justify-center gap-3 bg-[var(--primary-dark, var(--primary-dark, #7c3aed))] text-white py-4 rounded-md font-black text-sm shadow-[4px_4px_0_rgba(0,0,0,0.4)] active:scale-95 transition-all pointer-events-auto"
 ><ChevronLeft size={20} />
 VOLTAR PARA LISTA
 </button></motion.div>
 )}
 </AnimatePresence>
 
 {!isMobile && (
 <footer className="px-12 py-5 border-t border-[var(--ledger-paper-border)] flex items-center justify-between text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-[0.2em] bg-[var(--ledger-paper-bg)]"><div className="flex items-center gap-6"><span className={`flex items-center gap-2 transition-colors ${
 syncState.status === 'synced' ? 'text-emerald-500/60' :
 syncState.status === 'saving' ? 'text-yellow-500/60' :
 syncState.status === 'typing' ? 'text-[var(--primary)]/60' :
 'text-[var(--ink-muted)]'
 }`}> <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
 syncState.status === 'synced' ? 'bg-emerald-500' :
 syncState.status === 'saving' ? 'bg-yellow-500' :
 syncState.status === 'typing' ? 'bg-[var(--primary)]' :
 'bg-zinc-600'
 }`} />  
 {syncState.status === 'synced' ? 'Sincronizado' :
 syncState.status === 'saving' ? 'Salvando...' :
 syncState.status === 'typing' ? 'Digitando...' :
 'Ocioso'}
 </span></div><div className="flex items-center gap-8"><span>{selectedNote.content.replace(/<[^>]*>/g, '').length} caracteres</span></div></footer>
 )}
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-muted)] gap-4"><FileText size={64} className="opacity-5" /><p className="text-xs font-bold uppercase tracking-widest opacity-20">Selecione uma nota</p></div>
 )}
 </main>

 {/* BOTÃO FLUTUANTE (FAB) NO MOBILE - SÓ NA LISTA */}
 {isMobile && viewMode === 'list' && (
 <motion.button
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 whileTap={{ scale: 0.9 }}
 onClick={handleCreateNote}
 className="fixed bottom-24 right-6 w-16 h-16 bg-[var(--primary-dark, var(--primary-dark, #7c3aed))] text-white rounded-md shadow-[4px_4px_0_rgba(0,0,0,0.4)] flex items-center justify-center z-50 border border-[var(--ledger-paper-border)]"
 ><Plus size={32} /></motion.button>
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
 /><ConfirmDialog
 open={deleteFolderDialog.open}
 onOpenChange={(open) => setDeleteFolderDialog({ ...deleteFolderDialog, open })}
 title="Excluir pasta?"
 description={`Tem certeza que deseja excluir a pasta? As notas desta pasta serão movidas para "Sem pasta".`}
 confirmLabel="Excluir"
 cancelLabel="Cancelar"
 onConfirm={confirmDeleteFolder}
 /></div>
 );
}

// Componentes memoizados para evitar re-renders desnecessários
const NoteItem = React.memo(function NoteItem({ note, isSelected, onClick }: { note: NoteUI, isSelected: boolean, onClick: () => void }) {
 const getTagStyle = useCallback((folder: string) => {
 const colors: Record<string, string> = {
 "Trabalho": "bg-[#fee2e2] text-[#b91c1c] border-red-500/30",
 "Estudos": "bg-[#ede9fe] text-[#5b21b6] border-purple-500/30",
 "Pessoal": "bg-[#dcfce7] text-[#15803d] border-emerald-500/30",
 "Ideias": "bg-[#fef3c7] text-[#92400e] border-amber-500/30",
 "Sem pasta": "bg-[var(--ledger-paper-bg)] text-[var(--ink-muted)] border-[var(--border)]"
 };
 return colors[folder] || colors["Sem pasta"];
 }, []);
 const folderEmoji = useCallback((folder: string) => {
 const emojis: Record<string, string> = {
 "Trabalho": "💼 ",
 "Estudos": "📚 ",
 "Pessoal": "👤 ",
 "Ideias": "💡 ",
 "Sem pasta": "📁 "
 };
 return emojis[folder] || "📁 ";
 }, []);

 const preview = useMemo(() => generatePreview(note.content) || "Escreva algo incrível...", [note.content]);

 return (
 <motion.button 
 whileHover={{ x: 4 }}
 whileTap={{ scale: 0.98 }}
 onClick={onClick}
 className={`w-full text-left p-5 rounded-md transition-all group relative border ${isSelected ? 'bg-[#ede9fe] border-purple-500/30' : 'bg-[var(--ledger-paper-bg)] border-[var(--ledger-paper-border)] hover:bg-[var(--muted)] hover:border-[var(--primary)]'}`}
 >
 {/* Barra lateral de seleção curva e fosca */}
 {isSelected && (
 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--primary-dark, var(--primary-dark, #7c3aed))]" />
 )}

 <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-3 truncate"><h3 className={`font-black text-[16px] truncate tracking-tight ${isSelected ? 'text-[#5b21b6]' : 'text-[var(--ink)] group-hover:text-[var(--primary)]'}`}>
 {note.title}
 </h3></div>
 {note.fixed && <Pin size={12} className="text-[var(--accent)] fill-[var(--accent)]/20 mt-1 flex-shrink-0" />}
 </div><p className="text-sm text-[var(--ink-muted)] line-clamp-1 mb-4 leading-relaxed font-medium">
 {preview}
 </p><div className="flex items-center justify-between"><span className="text-[9px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">{formatDate(note.updated_at)}</span><span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tight ${getTagStyle(note.folder)}`}>
 {folderEmoji(note.folder)}{note.folder}
 </span></div></motion.button>
 );
});

const ToolbarButton = React.memo(function ToolbarButton({ icon, tooltip, onClick, menuItems }: { icon: React.ReactNode, tooltip?: string, onClick?: () => void, menuItems?: any[] }) {
 const [showMenu, setShowMenu] = useState(false);

 return (
 <div className="relative"><button 
 onClick={() => menuItems ? setShowMenu(!showMenu) : onClick?.()}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--muted)] transition-all active:scale-90" 
 title={tooltip}
 >
 {icon}
 </button>
 {showMenu && menuItems && (
 <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md shadow-[3px_3px_0_rgba(0,0,0,0.3)] py-2 z-50">
 {menuItems.map((item, idx) => (
 <button
 key={idx}
 onClick={() => { item.onClick(); setShowMenu(false); }}
 className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors ${item.danger ? 'text-rose-500 hover:bg-rose-500/10' : 'text-[var(--ink-muted)] hover:bg-[var(--muted)] hover:text-[var(--ink)]'}`}
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
 className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-all active:scale-90 ${active ? 'text-[#5b21b6] bg-[#ede9fe] border border-purple-500/30' : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--muted)]'}`} 
 title={tooltip}
 >
 {icon}
 </button>
 );
});

const FolderMenu = React.memo(function FolderMenu({ onDelete }: { onDelete: () => void }) {
 const [showMenu, setShowMenu] = useState(false);

 return (
 <div className="relative"><button 
 onClick={() => setShowMenu(!showMenu)}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--primary)] transition-all"
 ><MoreVertical size={14} /></button>
 {showMenu && (
 <div className="absolute left-full ml-2 top-0 w-40 bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md shadow-[3px_3px_0_rgba(0,0,0,0.3)] py-2 z-50"><button
 onClick={() => { onDelete(); setShowMenu(false); }}
 className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
 ><Trash2 size={14} />
 Excluir Pasta
 </button></div>
 )}
 </div>
 );
});
