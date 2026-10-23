import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createNote, getNotes } from "@/lib/notes";
import { createFolder, deleteFolder, getFolders } from "@/lib/noteFolders";
import { htmlToText } from "@/lib/noteText";
import type { NoteDatabaseRow, NoteFolderDatabaseRow } from "@/lib/database/types";
import { notifyError } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, IconButton, Input, Screen, Sheet, Txt } from "@/components/ui";
import { fonts, useTheme } from "@/theme";

const ALL = "__all__";
const FAV = "__fav__";

// Porta de pages/Notes.tsx: lista, busca, pastas e favoritas.
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
  const [folder, setFolder] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [showFolder, setShowFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const reload = useCallback(async () => {
    if (IS_DEMO) return;
    const [n, f] = await Promise.all([getNotes(), getFolders()]);
    setNotes(n);
    setFolders(f);
  }, []);

  // Recarrega ao voltar do editor.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const visible = notes
    .filter(n => (folder === ALL ? true : folder === FAV ? n.favorite : n.folder_id === folder))
    .filter(n => {
      const q = search.trim().toLowerCase();
      return !q || n.title.toLowerCase().includes(q) || htmlToText(n.content).toLowerCase().includes(q);
    })
    .sort((a, b) => Number(b.fixed) - Number(a.fixed) || b.updated_at.localeCompare(a.updated_at));

  const newNote = async () => {
    try {
      const created = await createNote({
        title: "Nova nota",
        content: "",
        favorite: false,
        fixed: false,
        folder_id: folder !== ALL && folder !== FAV ? folder : null,
      });
      if (created) router.push({ pathname: "/notes/[id]", params: { id: created.id } });
    } catch (error) {
      notifyError("Erro ao criar nota", error instanceof Error ? error.message : undefined);
    }
  };

  const addFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await createFolder({ name: folderName.trim() });
      setFolderName("");
      setShowFolder(false);
      void reload();
    } catch (error) {
      notifyError("Erro ao criar pasta", error instanceof Error ? error.message : undefined);
    }
  };

  const removeFolder = (f: NoteFolderDatabaseRow) => {
    Alert.alert("Excluir pasta", `Excluir a pasta "${f.name}"? As notas ficam em "Sem pasta".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await deleteFolder(f.id);
          if (folder === f.id) setFolder(ALL);
          void reload();
        },
      },
    ]);
  };

  const chips = [
    { id: ALL, name: "Todas" },
    { id: FAV, name: "★ Favoritas" },
    ...folders.map(f => ({ id: f.id, name: f.name })),
  ];

  return (
    <Screen back title="Notas" right={<IconButton icon="add" label="Nova nota" onPress={newNote} filled />}>
      <Input placeholder="Buscar notas..." value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map(chip => (
          <Pressable
            key={chip.id}
            onPress={() => setFolder(chip.id)}
            onLongPress={() => {
              const f = folders.find(x => x.id === chip.id);
              if (f) removeFolder(f);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: folder === chip.id ? theme.primary : theme.border,
              backgroundColor: folder === chip.id ? theme.primarySoft : theme.surface,
            }}
          >
            <Txt variant="label" color={folder === chip.id ? theme.primaryInk : theme.ink}>
              {chip.name}
            </Txt>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setShowFolder(true)}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderStyle: "dashed", borderColor: theme.border }}
        >
          <Txt variant="label" muted>
            + Pasta
          </Txt>
        </Pressable>
      </ScrollView>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon="document-text-outline" text="Nenhuma nota aqui." />
          <Button label="Nova nota" icon="add" variant="soft" onPress={newNote} />
        </Card>
      ) : (
        visible.map(note => {
          const preview = htmlToText(note.content);
          return (
            <Card key={note.id} onPress={() => router.push({ pathname: "/notes/[id]", params: { id: note.id } })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {note.fixed && <Ionicons name="pin" size={14} color={theme.primary} />}
                <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                  {note.title || "Sem título"}
                </Txt>
                {note.favorite && <Ionicons name="star" size={14} color={theme.accent} />}
              </View>
              {preview ? (
                <Txt variant="label" muted numberOfLines={3}>
                  {preview}
                </Txt>
              ) : null}
              <Txt variant="caption" muted style={{ fontFamily: fonts.bodyMedium }}>
                {new Date(note.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {note.folder_id ? ` · ${folders.find(f => f.id === note.folder_id)?.name ?? ""}` : ""}
              </Txt>
            </Card>
          );
        })
      )}

      <Sheet visible={showFolder} onClose={() => setShowFolder(false)} title="Nova pasta">
        <Input label="Nome da pasta" value={folderName} onChangeText={setFolderName} />
        <Button label="Criar pasta" onPress={addFolder} disabled={!folderName.trim()} />
      </Sheet>
    </Screen>
  );
}
