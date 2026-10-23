import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { deleteNote, getNotes, updateNote } from "@/lib/notes";
import { getFolders } from "@/lib/noteFolders";
import { htmlToText, textToHtml } from "@/lib/noteText";
import type { NoteDatabaseRow, NoteFolderDatabaseRow } from "@/lib/database/types";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { ProGate } from "@/components/ProGate";
import { Button, Card, IconButton, Screen, Txt } from "@/components/ui";
import { fonts, useTheme } from "@/theme";

// Editor de nota. Salva manualmente (como o "salvamento manual" do web) e
// também ao sair da tela, se houver alterações.
export default function NoteEditorScreen() {
  return (
    <ProGate section="notes">
      <NoteEditor />
    </ProGate>
  );
}

function NoteEditor() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<NoteDatabaseRow | null>(null);
  const [folders, setFolders] = useState<NoteFolderDatabaseRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const latest = useRef({ title: "", body: "" });

  useEffect(() => {
    void (async () => {
      const [notes, f] = await Promise.all([getNotes(), getFolders()]);
      const found = notes.find(n => n.id === id) ?? null;
      setFolders(f);
      setNote(found);
      if (found) {
        setTitle(found.title);
        setBody(htmlToText(found.content));
      }
    })();
  }, [id]);

  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);

  // Salva ao sair se o usuário esqueceu.
  useEffect(
    () => () => {
      if (dirty.current && id) {
        void updateNote(id, { title: latest.current.title, content: textToHtml(latest.current.body) });
      }
    },
    [id]
  );

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateNote(id, { title, content: textToHtml(body) });
      dirty.current = false;
      notifySuccess("Nota salva");
    } catch (error) {
      notifyError("Erro ao salvar", error instanceof Error ? error.message : undefined);
    }
    setSaving(false);
  };

  const toggle = async (field: "favorite" | "fixed") => {
    if (!note || !id) return;
    const value = !note[field];
    setNote({ ...note, [field]: value });
    await updateNote(id, { [field]: value });
  };

  const setFolder = async (folderId: string | null) => {
    if (!note || !id) return;
    setNote({ ...note, folder_id: folderId });
    await updateNote(id, { folder_id: folderId });
  };

  const remove = () => {
    Alert.alert("Excluir nota", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          dirty.current = false;
          await deleteNote(id);
          router.back();
        },
      },
    ]);
  };

  if (!note) {
    return (
      <Screen back title="Nota">
        <Txt muted>Carregando...</Txt>
      </Screen>
    );
  }

  return (
    <Screen
      back
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton icon={note.fixed ? "pin" : "pin-outline"} label="Fixar" onPress={() => void toggle("fixed")} color={theme.primary} />
          <IconButton icon={note.favorite ? "star" : "star-outline"} label="Favoritar" onPress={() => void toggle("favorite")} color={theme.accent} />
          <IconButton icon="trash-outline" label="Excluir" onPress={remove} color={theme.danger} />
        </View>
      }
    >
      <Card style={{ gap: 6 }}>
        <TextInput
          value={title}
          onChangeText={text => {
            setTitle(text);
            dirty.current = true;
          }}
          placeholder="Título"
          placeholderTextColor={theme.inkMuted}
          style={{ fontFamily: fonts.display, fontSize: 24, color: theme.ink }}
        />
        <TextInput
          value={body}
          onChangeText={text => {
            setBody(text);
            dirty.current = true;
          }}
          placeholder="Comece a escrever..."
          placeholderTextColor={theme.inkMuted}
          multiline
          style={{ fontFamily: fonts.body, fontSize: 17, lineHeight: 28, color: theme.ink, minHeight: 320, textAlignVertical: "top" }}
        />
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null as string | null, name: "Sem pasta" }, ...folders].map(f => (
          <Pressable
            key={f.id ?? "none"}
            onPress={() => void setFolder(f.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: note.folder_id === f.id ? theme.primary : theme.border,
              backgroundColor: note.folder_id === f.id ? theme.primarySoft : theme.surface,
            }}
          >
            <Ionicons name="folder-outline" size={14} color={theme.inkMuted} />
            <Txt variant="label">{f.name}</Txt>
          </Pressable>
        ))}
      </ScrollView>

      <Button label="Salvar" icon="save-outline" onPress={save} loading={saving} />
      <Txt variant="caption" muted style={{ textAlign: "center" }}>
        Formatação rica feita no site (negrito, listas) vira texto simples ao salvar pelo celular.
      </Txt>
    </Screen>
  );
}
