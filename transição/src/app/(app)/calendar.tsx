import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Alert } from "@/lib/alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString, toYYYYMMDD } from "@/lib/store";
import { addAppointment, deleteAppointment, getAppointmentsForDate, loadAppointments } from "@/store/appointments.store";
import {
  addCalendarNote,
  deleteCalendarNote,
  getCalendarNoteForDate,
  loadCalendarNotes,
} from "@/store/calendar-notes.store";
import { APPOINTMENT_CATEGORIES, APPOINTMENT_COLORS, type Appointment, type CalendarNote } from "@/store/calendar.types";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { useStore } from "@/hooks/useStore";
import { Button, Card, EmptyState, IconButton, Input, Marginalia, Screen, Sheet, Txt } from "@/components/ui";
import { longDate, TaskRow } from "@/components/rows";
import { fonts, resolveColor, useTheme } from "@/theme";
import { Glyph, stripEmoji } from "@/components/Glyph";

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
  const [noteText, setNoteText] = useState("");
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

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const dayTasks = data.tasks.filter(t => t.date === selected);
  const dayApts = getAppointmentsForDate(appointments, selected).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // CalendarNoteModal do web: sempre cria uma anotação nova para o dia.
  const saveNote = async () => {
    if (!noteText.trim()) {
      notifyInfo("Anotação não pode estar vazia");
      return false;
    }
    try {
      const created = await addCalendarNote({ content: noteText.trim(), date: selected });
      if (!created) {
        notifyError("Erro ao criar anotação");
        return false;
      }
      notifySuccess("Anotação criada!");
      setNoteText("");
      void reload();
      return true;
    } catch {
      notifyError("Erro ao salvar anotação");
      return false;
    }
  };

  const removeNote = (id: string) =>
    Alert.alert("Deletar anotação", "Tem certeza que deseja deletar esta anotação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          await deleteCalendarNote(id);
          notifySuccess("Anotação deletada!");
          void reload();
        },
      },
    ]);

  const removeApt = (apt: Appointment) => {
    Alert.alert("Deletar compromisso", "Tem certeza que deseja deletar este compromisso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          await deleteAppointment(apt.id);
          notifySuccess("Compromisso deletado!");
          void reload();
        },
      },
    ]);
  };

  const goToToday = () => {
    setCursor(new Date());
    setSelected(today);
  };

  // Grade de 6 semanas com os dias dos meses vizinhos apagados (como no site).
  const firstWeekday = new Date(year, month, 1).getDay();
  const grid = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - firstWeekday + i);
    return { key: toYYYYMMDD(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
  const dayGoals = data.goals.filter(g => g.deadline === selected);
  const goalsCount = dayGoals.length;

  return (
    <Screen title="Calendário" subtitle="Visão geral de tarefas e metas" right={<IconButton icon="calendar-outline" label="Hoje" onPress={goToToday} />}>
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
            const cellGoals = data.goals.filter(g => g.deadline === key);
            const marks = [
              list.some(t => t.completed) ? theme.success : null,
              list.some(t => !t.completed && t.date >= today) ? theme.accent : null,
              list.some(t => !t.completed && t.date < today) ? theme.danger : null,
              appointments.some(a => a.date === key) ? theme.blue : null,
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
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 }}>
                    {marks.map((c, j) => (
                      <Dot key={j} color={c} />
                    ))}
                    {cellGoals.slice(0, 2).map(g => (
                      <Glyph key={g.id} emoji={g.emoji} size={10} />
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

      <Card>
        <Marginalia>Metas (prazo)</Marginalia>
        {dayGoals.length === 0 ? (
          <EmptyState text="Nenhuma meta com prazo neste dia" />
        ) : (
          dayGoals.map(goal => {
            const color = resolveColor(goal.color, theme);
            return (
              <View key={goal.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: `${color}40`, backgroundColor: `${color}14` }}>
                <Glyph emoji={goal.emoji} size={16} />
                <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>
                  {goal.title}
                </Txt>
                {goal.completedAt ? <Ionicons name="checkmark-circle" size={14} color={theme.success} /> : null}
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Marginalia>Compromissos</Marginalia>
        {dayApts.length === 0 ? (
          <EmptyState text="Nenhum compromisso" />
        ) : (
          dayApts.map(apt => {
            const color = resolveColor(apt.color, theme);
            return (
              <View key={apt.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: `${color}33`, backgroundColor: `${color}14` }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="caption" color={color} style={{ fontFamily: fonts.bodyBold }}>
                    {apt.startTime} - {apt.endTime}
                  </Txt>
                  <Txt variant="label" numberOfLines={1}>
                    {apt.title}
                  </Txt>
                  {apt.category ? (
                    <Txt variant="caption" muted style={{ fontSize: 10 }}>
                      {stripEmoji(apt.category)}
                    </Txt>
                  ) : null}
                </View>
                <Pressable onPress={() => removeApt(apt)} hitSlop={8} accessibilityLabel="Deletar compromisso" style={{ padding: 4 }}>
                  <Ionicons name="close" size={14} color={theme.inkMuted} />
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Marginalia>Anotação</Marginalia>
        {note ? (
          <>
            <Txt style={{ lineHeight: 20 }}>{note.content}</Txt>
            <Button label="Deletar anotação" variant="ghost" compact onPress={() => removeNote(note.id)} />
          </>
        ) : (
          <EmptyState text="Nenhuma anotação" />
        )}
      </Card>

      <AppointmentSheet visible={showNew} date={selected} onClose={() => setShowNew(false)} onSaved={reload} />
      <Sheet visible={showNote} onClose={() => setShowNote(false)} title="Nova Anotação">
        <Input label="Anotação *" value={noteText} onChangeText={setNoteText} placeholder="Escreva sua anotação para este dia..." multiline />
        <Txt variant="caption" muted>
          {noteText.length} caracteres
        </Txt>
        <Button
          label="Salvar"
          onPress={async () => {
            if (await saveNote()) setShowNote(false);
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
  const [category, setCategory] = useState<string>("");
  const [color, setColor] = useState<string>(APPOINTMENT_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const format = /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime);
  const valid = format && endTime > startTime;

  const save = async () => {
    if (!title.trim()) {
      notifyInfo("Título é obrigatório");
      return;
    }
    if (!valid) return;
    setSaving(true);
    try {
      const created = await addAppointment({ title: title.trim(), description: description.trim() || undefined, startTime, endTime, date, category: category || undefined, color });
      if (!created) {
        notifyError("Erro ao criar compromisso");
        return;
      }
    } catch {
      notifyError("Erro ao salvar compromisso");
      return;
    } finally {
      setSaving(false);
    }
    notifySuccess("Compromisso criado!");
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("10:00");
    setCategory("");
    onSaved();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Novo compromisso">
      <Txt variant="label" muted>
        {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
      </Txt>
      <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Ex: Reunião com cliente" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Início *" value={startTime} onChangeText={setStartTime} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Término *" value={endTime} onChangeText={setEndTime} placeholder="10:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        </View>
      </View>
      {!valid && (
        <Txt variant="caption" color={theme.danger}>
          {format ? "Hora de término deve ser após a hora de início" : "Use o formato HH:MM"}
        </Txt>
      )}
      <Input label="Descrição" value={description} onChangeText={setDescription} placeholder="Adicione detalhes sobre o compromisso..." multiline />
      <Marginalia>Categoria</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {APPOINTMENT_CATEGORIES.map(c => (
          <Pressable
            key={c}
            onPress={() => setCategory(category === c ? "" : c)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: category === c ? theme.primary : theme.border,
              backgroundColor: category === c ? theme.primarySoft : "transparent",
            }}
          >
            <Txt variant="label">{stripEmoji(c)}</Txt>
          </Pressable>
        ))}
      </View>
      <Marginalia>Cor da tinta</Marginalia>
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
      <Button label="Criar Compromisso" onPress={save} loading={saving} />
    </Sheet>
  );
}
