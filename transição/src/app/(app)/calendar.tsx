import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString, toYYYYMMDD } from "@/lib/store";
import { addAppointment, deleteAppointment, getAppointmentsForDate, loadAppointments } from "@/store/appointments.store";
import {
  addCalendarNote,
  deleteCalendarNote,
  getCalendarNoteForDate,
  loadCalendarNotes,
  updateCalendarNote,
} from "@/store/calendar-notes.store";
import { APPOINTMENT_CATEGORIES, APPOINTMENT_COLORS, type Appointment, type CalendarNote } from "@/store/calendar.types";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { useStore } from "@/hooks/useStore";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Sheet, Txt } from "@/components/ui";
import { TaskRow } from "@/components/rows";
import { fonts, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

// Porta de pages/CalendarView.tsx (tarefas, compromissos e anotações por dia).
export default function CalendarScreen() {
  const theme = useTheme();
  const data = useStore();
  const today = getTodayString();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  // Rascunho da anotação, preso ao dia em que foi digitado.
  const [draft, setDraft] = useState<{ date: string; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    if (IS_DEMO) return;
    const [apts, nts] = await Promise.all([loadAppointments(), loadCalendarNotes()]);
    setAppointments(apts);
    setNotes(nts);
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    let active = true;
    void Promise.all([loadAppointments(), loadCalendarNotes()]).then(([apts, nts]) => {
      if (!active) return;
      setAppointments(apts);
      setNotes(nts);
    });
    return () => {
      active = false;
    };
  }, []);

  const note = getCalendarNoteForDate(notes, selected);
  const noteText = draft?.date === selected ? draft.text : note?.content ?? "";
  const setNoteText = (text: string) => setDraft({ date: selected, text });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => toYYYYMMDD(new Date(year, month, i + 1)))];
  }, [year, month]);

  const dayTasks = data.tasks.filter(t => t.date === selected);
  const dayApts = getAppointmentsForDate(appointments, selected).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const saveNote = async () => {
    if (note) {
      if (!noteText.trim()) await deleteCalendarNote(note.id);
      else await updateCalendarNote(note.id, { content: noteText });
    } else if (noteText.trim()) {
      await addCalendarNote({ content: noteText, date: selected });
    }
    notifySuccess("Anotação salva");
    setDraft(null);
    void reload();
  };

  const removeApt = (apt: Appointment) => {
    Alert.alert("Excluir compromisso", `Excluir "${apt.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await deleteAppointment(apt.id);
          void reload();
        },
      },
    ]);
  };

  return (
    <Screen back title="Calendário" right={<IconButton icon="add" label="Novo compromisso" onPress={() => setShowNew(true)} filled />}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} hitSlop={10} accessibilityLabel="Mês anterior">
            <Ionicons name="chevron-back" size={22} color={theme.ink} />
          </Pressable>
          <Txt variant="h3" style={{ flex: 1, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </Txt>
          <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} hitSlop={10} accessibilityLabel="Próximo mês">
            <Ionicons name="chevron-forward" size={22} color={theme.ink} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row" }}>
          {WEEK.map((d, i) => (
            <Txt key={i} variant="caption" muted style={{ flex: 1, textAlign: "center" }}>
              {d}
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((key, i) => {
            if (!key) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 46 }} />;
            const isSel = key === selected;
            const isToday = key === today;
            const hasTask = data.tasks.some(t => t.date === key && !t.completed);
            const hasApt = appointments.some(a => a.date === key);
            const hasNote = notes.some(n => n.date === key);
            return (
              <Pressable key={key} onPress={() => setSelected(key)} style={{ width: `${100 / 7}%`, height: 46, alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSel ? theme.primary : "transparent",
                    borderWidth: isToday && !isSel ? 1 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <Txt style={{ fontFamily: fonts.bodySemi }} color={isSel ? "#fff" : theme.ink}>
                    {Number(key.slice(8))}
                  </Txt>
                </View>
                <View style={{ flexDirection: "row", gap: 2, position: "absolute", bottom: 2 }}>
                  {hasTask && <Dot color={theme.primary} />}
                  {hasApt && <Dot color={theme.accent} />}
                  {hasNote && <Dot color={theme.success} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Txt variant="h2">
        {(() => {
          const label = new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
          return label.charAt(0).toUpperCase() + label.slice(1);
        })()}
      </Txt>

      <SectionTitle>Compromissos</SectionTitle>
      <Card>
        {dayApts.length === 0 ? (
          <EmptyState text="Nenhum compromisso." />
        ) : (
          dayApts.map(apt => (
            <Pressable key={apt.id} onLongPress={() => removeApt(apt)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: apt.color }} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{apt.title}</Txt>
                <Txt variant="caption" muted>
                  {apt.startTime}–{apt.endTime}
                  {apt.category ? ` · ${apt.category}` : ""}
                </Txt>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <SectionTitle>Tarefas</SectionTitle>
      <Card>
        {dayTasks.length === 0 ? <EmptyState text="Nenhuma tarefa." /> : dayTasks.map(task => <TaskRow key={task.id} task={task} />)}
      </Card>

      <SectionTitle>Anotação do dia</SectionTitle>
      <Card>
        <Input value={noteText} onChangeText={setNoteText} placeholder="Escreva algo sobre este dia..." multiline />
        <Button label="Salvar anotação" variant="soft" onPress={saveNote} compact />
      </Card>

      <AppointmentSheet visible={showNew} date={selected} onClose={() => setShowNew(false)} onSaved={reload} />
    </Screen>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />;
}

function AppointmentSheet({
  visible,
  date,
  onClose,
  onSaved,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<string>(APPOINTMENT_CATEGORIES[0]);
  const [color, setColor] = useState<string>(APPOINTMENT_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const valid = /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime) && endTime > startTime;

  const save = async () => {
    if (!title.trim() || !valid) return;
    setSaving(true);
    const created = await addAppointment({ title: title.trim(), description, startTime, endTime, date, category, color });
    setSaving(false);
    if (!created) {
      notifyError("Erro ao salvar compromisso");
      return;
    }
    notifySuccess("Compromisso criado!");
    setTitle("");
    setDescription("");
    onSaved();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Novo compromisso">
      <Txt variant="label" muted>
        {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
      </Txt>
      <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Ex.: Consulta médica" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Início" value={startTime} onChangeText={setStartTime} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Fim" value={endTime} onChangeText={setEndTime} placeholder="10:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        </View>
      </View>
      {!valid && (
        <Txt variant="caption" color={theme.danger}>
          Use o formato HH:MM e um fim depois do início.
        </Txt>
      )}
      <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {APPOINTMENT_CATEGORIES.map(c => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: category === c ? theme.primary : theme.border,
              backgroundColor: category === c ? theme.primarySoft : "transparent",
            }}
          >
            <Txt variant="label">{c}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {APPOINTMENT_COLORS.map(c => (
          <Pressable
            key={c.value}
            onPress={() => setColor(c.value)}
            accessibilityLabel={c.name}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.value, borderWidth: color === c.value ? 3 : 0, borderColor: theme.ink }}
          />
        ))}
      </View>
      <Button label="Salvar compromisso" onPress={save} loading={saving} disabled={!title.trim() || !valid} />
    </Sheet>
  );
}
