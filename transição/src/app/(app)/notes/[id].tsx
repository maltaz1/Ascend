import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Alert } from "@/lib/alert";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { deleteNote, getNotes, updateNote } from "@/lib/notes";
import { getFolders } from "@/lib/noteFolders";
import { htmlToText, textToHtml } from "@/lib/noteText";
import type { NoteDatabaseRow, NoteFolderDatabaseRow } from "@/lib/database/types";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { ProGate } from "@/components/ProGate";
import { Card, IconButton, Screen, Txt } from "@/components/ui";
import { fonts, useTheme } from "@/theme";

type SyncStatus = "idle" | "typing" | "saving" | "synced";
const STATUS_LABEL: Record<SyncStatus, string> = { idle: "Ocioso", typing: "Digitando...", saving: "Salvando...", synced: "Sincronizado" };

// Editor de nota: salva sozinho 0,8 s depois de parar de digitar (como o web),
// tem o botão Salvar, Favoritar / Fixar / Excluir, pasta e contador de caracteres.
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
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [showMenu, setShowMenu] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const bodyChanged = useRef(false);
  const latest = useRef({ title: "", body: "", content: "" });

  useEffect(() => {
    void (async () => {
      const [notes, f] = await Promise.all([getNotes(), getFolders()]);
      const found = notes.find(n => n.id === id) ?? null;
      setFolders(f);
      setNote(found);
      if (found) {
        setTitle(found.title);
        setBody(htmlToText(found.content));
        latest.current = { title: found.title, body: htmlToText(found.content), content: found.content };
      }
    })();
  }, [id]);

  // Só reescreve o conteúdo se o texto foi editado aqui; assim a formatação feita no site não se perde.
  const payload = () => ({
    title: latest.current.title,
    content: bodyChanged.current ? textToHtml(latest.current.body) : latest.current.content,
  });

  const persist = async (manual: boolean) => {
    if (!id) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    try {
      setStatus("saving");
      await updateNote(id, payload());
      pending.current = false;
      setStatus("synced");
      if (manual) notifySuccess("Nota salva com sucesso!");
    } catch {
      setStatus("idle");
      notifyError("Erro ao salvar nota");
    }
  };

  const schedule = () => {
    pending.current = true;
    setStatus("typing");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(false), 800);
  };

  // Ao sair com algo pendente, salva na hora.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current && id) void updateNote(id, payload());
    },
    [id]
  );

  const toggle = async (field: "favorite" | "fixed") => {
    if (!note || !id) return;
    const value = !note[field];
    setNote({ ...note, [field]: value });
    try {
      await updateNote(id, { [field]: value });
    } catch {
      notifyError("Erro ao atualizar nota");
    }
  };

  const setFolder = async (folderId: string | null) => {
    if (!note || !id) return;
    setNote({ ...note, folder_id: folderId });
    try {
      await updateNote(id, { folder_id: folderId });
    } catch {
      notifyError("Erro ao atualizar nota");
    }
  };

  const remove = () => {
    Alert.alert("Excluir nota?", "Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          pending.current = false;
          if (timer.current) clearTimeout(timer.current);
          try {
            await deleteNote(id);
            notifySuccess("Nota excluída!");
            router.back();
          } catch {
            notifyError("Erro ao excluir nota");
          }
        },
      },
    ]);
  };

  if (!note) {
    return (
      <Screen back title="Nota">
        <Txt muted>Carregando notas...</Txt>
      </Screen>
    );
  }

  const statusColor = status === "synced" ? theme.success : status === "saving" ? theme.warning : status === "typing" ? theme.primary : theme.inkMuted;

  return (
    <Screen
      back
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton icon="save-outline" label="Salvar nota agora" onPress={() => void persist(true)} />
          <IconButton icon="ellipsis-vertical" label="Mais opções" onPress={() => setShowMenu(v => !v)} />
        </View>
      }
    >
      {showMenu ? (
        <Card padded={false} style={{ gap: 0, overflow: "hidden" }}>
          <MenuRow
            label="Favoritar"
            icon={note.favorite ? "star" : "star-outline"}
            color={note.favorite ? theme.accent : theme.inkMuted}
            onPress={() => {
              setShowMenu(false);
              void toggle("favorite");
            }}
          />
          <MenuRow
            label="Fixar"
            icon={note.fixed ? "pin" : "pin-outline"}
            color={note.fixed ? theme.accent : theme.inkMuted}
            divider
            onPress={() => {
              setShowMenu(false);
              void toggle("fixed");
            }}
          />
          <MenuRow
            label="Excluir Nota"
            icon="trash-outline"
            color={theme.danger}
            divider
            danger
            onPress={() => {
              setShowMenu(false);
              remove();
            }}
          />
        </Card>
      ) : null}

      <Card style={{ gap: 6 }}>
        <TextInput
          value={title}
          onChangeText={text => {
            setTitle(text);
            latest.current.title = text;
            schedule();
          }}
          placeholder="Título da nota"
          placeholderTextColor={theme.inkMuted}
          style={{ fontFamily: fonts.display, fontSize: 24, color: theme.ink }}
        />
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
              <Txt variant="label">📁 {f.name}</Txt>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          value={body}
          onChangeText={text => {
            setBody(text);
            latest.current.body = text;
            bodyChanged.current = true;
            schedule();
          }}
          placeholder="Comece a escrever..."
          placeholderTextColor={theme.inkMuted}
          multiline
          style={{ fontFamily: fonts.body, fontSize: 17, lineHeight: 28, color: theme.ink, minHeight: 320, textAlignVertical: "top" }}
        />
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
          <Txt variant="caption" color={statusColor} style={{ fontFamily: fonts.bodyBold, letterSpacing: 1, textTransform: "uppercase", fontSize: 10 }}>
            {STATUS_LABEL[status]}
          </Txt>
        </View>
        <Txt variant="caption" muted style={{ fontFamily: fonts.bodyBold, letterSpacing: 1, textTransform: "uppercase", fontSize: 10 }}>
          {body.length} caracteres
        </Txt>
      </View>
    </Screen>
  );
}

function MenuRow({
  label,
  icon,
  color,
  onPress,
  divider,
  danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  divider?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: divider ? 1 : 0, borderTopColor: theme.border }}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Txt variant="label" color={danger ? theme.danger : theme.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}
