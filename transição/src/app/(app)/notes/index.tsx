import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Alert } from "@/lib/alert";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createNote, getNotes } from "@/lib/notes";
import { createFolder, deleteFolder, getFolders } from "@/lib/noteFolders";
import type { NoteDatabaseRow, NoteFolderDatabaseRow } from "@/lib/database/types";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { ProGate } from "@/components/ProGate";
import { Button, Card, IconButton, Input, Marginalia, Screen, Txt } from "@/components/ui";
import { fonts, useTheme } from "@/theme";
import { useNewParam } from "@/hooks/useNewParam";

// Mesma prévia e data relativa da lista do web.
function notePreview(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function relativeDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "hoje";
  if (date.toDateString() === yesterday.toDateString()) return "ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toLowerCase();
}

const FOLDER_EMOJI: Record<string, string> = { Trabalho: "💼", Estudos: "📚", Pessoal: "👤", Ideias: "💡" };

// Porta de pages/Notes.tsx: busca, Fixadas, Pastas e Notas.
export default function NotesScreen() {
  return (
    <ProGate section="notes">
      <NotesList />
    </ProGate>
  );
}

function NotesList() {
  const theme = useTheme();
  const [notes, setNotes] = useState<NoteDatabaseRow[]>([]);
  const [folders, setFolders] = useState<NoteFolderDatabaseRow[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const reload = useCallback(async () => {
    if (IS_DEMO) return;
    try {
      const [n, f] = await Promise.all([getNotes(), getFolders()]);
      setNotes(n);
      setFolders(f);
    } catch {
      notifyError("Erro ao carregar notas");
    }
  }, []);

  // Recarrega ao voltar do editor.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const folderNameOf = (note: NoteDatabaseRow) => (note.folder_id ? folders.find(f => f.id === note.folder_id)?.name || "Sem pasta" : "Sem pasta");
  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) && (!activeFolder || folderNameOf(n) === activeFolder));
  const fixed = filtered.filter(n => n.fixed);
  const others = filtered.filter(n => !n.fixed);

  const newNote = async () => {
    try {
      const created = await createNote({
        title: "Nova nota",
        content: "",
        favorite: false,
        fixed: false,
        folder_id: activeFolder ? folders.find(f => f.name === activeFolder)?.id || null : null,
      });
      if (created) {
        notifySuccess("Nota criada!");
        router.push({ pathname: "/notes/[id]", params: { id: created.id } });
      } else notifyError("Erro ao criar nota", "Entre na sua conta e tente de novo.");
    } catch (error) {
      const proOnly = error instanceof Error && error.message.includes("Only Pro");
      notifyError("Erro ao criar nota", proOnly ? "Notas fazem parte do plano Pro." : error instanceof Error ? error.message : undefined);
    }
  };
  useNewParam(() => void newNote());

  const addFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    if (folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      notifyInfo("Esta pasta já existe!");
      return;
    }
    try {
      const created = await createFolder({ name });
      if (created) setFolders(prev => [...prev, created]);
      setFolderName("");
      setCreatingFolder(false);
      notifySuccess("Pasta criada!");
    } catch {
      notifyError("Erro ao criar pasta");
    }
  };

  const removeFolder = (f: NoteFolderDatabaseRow) => {
    Alert.alert("Excluir pasta?", 'Tem certeza que deseja excluir a pasta? As notas desta pasta serão movidas para "Sem pasta".', [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFolder(f.id);
            setFolders(prev => prev.filter(x => x.id !== f.id));
            setNotes(prev => prev.map(n => (n.folder_id === f.id ? { ...n, folder_id: null } : n)));
            if (activeFolder === f.name) setActiveFolder(null);
            notifyInfo("Pasta removida!");
          } catch {
            notifyError("Erro ao excluir pasta");
          }
        },
      },
    ]);
  };

  const openNote = (note: NoteDatabaseRow) => router.push({ pathname: "/notes/[id]", params: { id: note.id } });

  return (
    <Screen title="Notas" right={<IconButton icon="add" label="Nova nota" onPress={newNote} filled />}>
      <Input icon="search" placeholder="Pesquisar notas..." value={search} onChangeText={setSearch} />

      {fixed.length > 0 ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="pin" size={11} color={theme.accent} />
            <Marginalia>Fixadas</Marginalia>
          </View>
          {fixed.map(note => (
            <NoteItem key={note.id} note={note} folder={folderNameOf(note)} onPress={() => openNote(note)} />
          ))}
        </>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Marginalia>Pastas</Marginalia>
        <Pressable onPress={() => setCreatingFolder(true)} hitSlop={10} accessibilityLabel="Nova pasta" style={{ padding: 6 }}>
          <Ionicons name="add" size={18} color={theme.inkMuted} />
        </Pressable>
      </View>
      {creatingFolder ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Input
              autoFocus
              placeholder="Nome da pasta..."
              value={folderName}
              onChangeText={setFolderName}
              onSubmitEditing={() => void addFolder()}
              onBlur={() => !folderName && setCreatingFolder(false)}
            />
          </View>
          <Button label="Criar" compact onPress={() => void addFolder()} disabled={!folderName.trim()} />
        </View>
      ) : null}
      {folders.map(f => {
        const active = activeFolder === f.name;
        return (
          <View key={f.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => setActiveFolder(active ? null : f.name)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? theme.primaryBorder : "transparent",
                backgroundColor: active ? theme.primarySoft : "transparent",
              }}
            >
              <Ionicons name="folder-outline" size={16} color={active ? theme.primary : theme.inkMuted} />
              <Txt variant="bodyStrong" color={active ? theme.primaryInk : theme.inkMuted} style={{ flex: 1 }}>
                {f.name}
              </Txt>
              <Ionicons name="chevron-forward" size={14} color={active ? theme.primary : theme.inkMuted} style={{ transform: [{ rotate: active ? "90deg" : "0deg" }] }} />
            </Pressable>
            <Pressable onPress={() => removeFolder(f)} hitSlop={8} accessibilityLabel={`Excluir pasta ${f.name}`} style={{ padding: 10 }}>
              <Ionicons name="trash-outline" size={15} color={theme.inkMuted} />
            </Pressable>
          </View>
        );
      })}

      <Marginalia>Notas</Marginalia>
      {folders.length === 0 && filtered.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
          <Ionicons name="document-text-outline" size={28} color={theme.inkMuted} />
          <Txt variant="bodyStrong" muted>
            Nenhuma nota ainda
          </Txt>
          <Txt variant="caption" muted style={{ textAlign: "center" }}>
            Comece criando sua primeira nota para organizar seus pensamentos.
          </Txt>
          <Button label="+ Criar primeira nota" compact onPress={newNote} />
        </Card>
      ) : (
        others.map(note => <NoteItem key={note.id} note={note} folder={folderNameOf(note)} onPress={() => openNote(note)} />)
      )}
    </Screen>
  );
}

function NoteItem({ note, folder, onPress }: { note: NoteDatabaseRow; folder: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {note.title}
        </Txt>
        {note.fixed ? <Ionicons name="pin" size={12} color={theme.accent} /> : null}
      </View>
      <Txt variant="label" muted numberOfLines={1}>
        {notePreview(note.content) || "Escreva algo incrível..."}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt variant="caption" muted style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
          {relativeDate(note.updated_at)}
        </Txt>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
          <Txt variant="caption" muted style={{ fontFamily: fonts.bodyBold, fontSize: 10, textTransform: "uppercase" }}>
            {FOLDER_EMOJI[folder] ?? "📁"} {folder}
          </Txt>
        </View>
      </View>
    </Card>
  );
}
