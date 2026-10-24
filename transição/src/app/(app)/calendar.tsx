import { useCallback, useEffect, useState } from "react";
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
import { Button, Card, EmptyState, Input, Marginalia, Screen, Sheet, Txt } from "@/components/ui";
import { longDate, TaskRow } from "@/components/rows";
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
  const [showNote, setShowNote] = useState(false);

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

  // Grade de 6 semanas com os dias dos meses vizinhos apagados (como no site).
  const firstWeekday = new Date(year, month, 1).getDay();
  const grid = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - firstWeekday + i);
    return { key: toYYYYMMDD(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
  const goalsCount = data.goals.filter(g => g.type !== "semanal" && g.deadline === selected).length;

  return (
    <Screen title="Calendário" subtitle="Visão geral de tarefas e metas">
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CalArrow icon="chevron-back" label="Mês anterior" onPress={() => setCursor(new Date(year, month - 1, 1))} />
          <Txt variant="h2" style={{ flex: 1, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </Txt>
          <CalArrow icon="chevron-forward" label="Próximo mês" onPress={() => setCursor(new Date(year, month + 1, 1))} />
        </View>
        <View style={{ flexDirection: "row" }}>
          {WEEK.map((d, i) => (
            <Txt key={i} style={{ flex: 1, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 11 }} muted>
              {d}
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {grid.map(({ key, day, inMonth }) => {
            const isSel = key === selected;
            const isToday = key === today;
            const list = data.tasks.filter(t => t.date === key);
            const marks = [
              list.some(t => t.completed) ? theme.success : null,
              list.some(t => !t.completed && t.date >= today) ? theme.accent : null,
              list.some(t => !t.completed && t.date < today) ? theme.danger : null,
              appointments.some(a => a.date === key) ? theme.blue : null,
              notes.some(n => n.date === key) ? theme.accent : null,
            ].filter(Boolean) as string[];
            return (
              <View key={key} style={{ width: `${100 / 7}%`, padding: 2.5 }}>
                <Pressable
                  onPress={() => {
                    if (!inMonth) setCursor(new Date(`${key}T12:00:00`));
                    setSelected(key);
                  }}
                  style={{
                    aspectRatio: 0.92,
                    borderRadius: 5,
                    alignItems: "center",
                    paddingTop: 8,
                    gap: 6,
                    backgroundColor: !inMonth ? "transparent" : isToday ? theme.accentSoft : theme.raised,
                    borderWidth: isToday || isSel ? 1 : 0,
                    borderColor: isToday ? theme.accent : theme.primary,
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <Txt style={{ fontFamily: isToday ? fonts.display : fonts.bodySemi, fontSize: 13 }} color={isToday ? theme.accent : theme.ink}>
                    {day}
                  </Txt>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {marks.slice(0, 3).map((c, j) => (
                      <Dot key={j} color={c} />
                    ))}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            { c: theme.success, l: "Concluída" },
            { c: theme.inkMuted, l: "Pendente" },
            { c: theme.danger, l: "Atrasada" },
            { c: theme.blue, l: "Compromisso" },
          ].map(item => (
            <View key={item.l} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Dot color={item.c} />
              <Txt variant="caption" muted>
                {item.l}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <Txt variant="h2">{longDate(new Date(`${selected}T12:00:00`))}</Txt>
        <Txt variant="caption" muted>
          {dayTasks.length} {dayTasks.length === 1 ? "tarefa" : "tarefas"} · {goalsCount} {goalsCount === 1 ? "meta" : "metas"}
        </Txt>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Compromisso" icon="add" onPress={() => setShowNew(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Anotação" icon="add" variant="ghost" onPress={() => setShowNote(true)} />
        </View>
      </View>

      <Card>
        <Marginalia>Compromissos</Marginalia>
        {dayApts.length === 0 ? (
          <EmptyState text="Nenhum compromisso." />
        ) : (
          dayApts.map(apt => (
            <Pressable key={apt.id} onLongPress={() => removeApt(apt)} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: theme.raised, borderRadius: 6, padding: 12 }}>
              <View style={{ width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: apt.color }} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{apt.title}</Txt>
                <Txt variant="caption" muted>
                  {apt.category ? `${apt.category} · ` : ""}
                </Txt>
              </View>
              <Txt variant="mono" muted style={{ fontSize: 12 }}>
                {apt.startTime}–{apt.endTime}
              </Txt>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Marginalia>Tarefas</Marginalia>
        {dayTasks.length === 0 ? (
          <EmptyState text="Nenhuma tarefa." />
        ) : (
          <View style={{ gap: 8 }}>
            {dayTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        )}
      </Card>

      {note || noteText ? (
        <Card tone="amber">
          <Marginalia>Anotação do dia</Marginalia>
          <Txt style={{ lineHeight: 21 }}>{note?.content ?? noteText}</Txt>
          <Button label="Editar anotação" variant="ghost" compact onPress={() => setShowNote(true)} />
        </Card>
      ) : null}

      <AppointmentSheet visible={showNew} date={selected} onClose={() => setShowNew(false)} onSaved={reload} />
      <Sheet visible={showNote} onClose={() => setShowNote(false)} title="Anotação do dia">
        <Input value={noteText} onChangeText={setNoteText} placeholder="Escreva algo sobre este dia..." multiline />
        <Button
          label="Salvar anotação"
          onPress={async () => {
            await saveNote();
            setShowNote(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function CalArrow({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={{ width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={16} color={theme.ink} />
    </Pressable>
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
