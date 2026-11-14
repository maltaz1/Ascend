import { useMemo } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RecurrenceConfig, RecurrenceType } from "@/types/recurrence";
import { fonts, useTheme } from "@/theme";
import { DateStrip } from "./DateStrip";
import { Card, Input, Marginalia, Segmented, Stamp, Txt } from "./ui";

// Porta de components/RecurrenceSection.tsx do web: tipo, intervalo personalizado,
// dias da semana, término e resumo.
const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "never", label: "Nunca" },
  { value: "daily", label: "Diária" },
  { value: "weekdays", label: "Dias úteis" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

const UNITS: { value: NonNullable<RecurrenceConfig["intervalUnit"]>; label: string }[] = [
  { value: "days", label: "Dias" },
  { value: "weeks", label: "Semanas" },
  { value: "months", label: "Meses" },
  { value: "years", label: "Anos" },
];

const WEEKDAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

const FULL_WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const END_TYPES: { value: RecurrenceConfig["endType"]; label: string }[] = [
  { value: "never", label: "Nunca" },
  { value: "after_occurrences", label: "Após X vezes" },
  { value: "on_date", label: "Em uma data" },
];

export function RecurrenceSection({ recurrence, onChange }: { recurrence: RecurrenceConfig; onChange: (r: RecurrenceConfig) => void }) {
  const theme = useTheme();

  const changeType = (type: RecurrenceType) => {
    const next: RecurrenceConfig = { ...recurrence, type, status: "active" };
    if (type === "custom") {
      next.interval = recurrence.interval || 1;
      next.intervalUnit = recurrence.intervalUnit || "days";
    }
    onChange(next);
  };

  const changeEnd = (endType: RecurrenceConfig["endType"]) => {
    const next: RecurrenceConfig = { ...recurrence, endType };
    if (endType === "after_occurrences") next.occurrences = recurrence.occurrences || 5;
    else if (endType === "on_date") next.endDate = recurrence.endDate || new Date().toISOString().split("T")[0];
    onChange(next);
  };

  const toggleDay = (day: number) => {
    const days = recurrence.daysOfWeek || [];
    onChange({ ...recurrence, daysOfWeek: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() });
  };

  const preview = useMemo(() => {
    if (recurrence.type === "never") return null;
    let text = "";
    if (recurrence.type === "daily") text = "Repete todos os dias";
    else if (recurrence.type === "weekdays") text = "Repete de segunda a sexta-feira";
    else if (recurrence.type === "weekly") {
      text = recurrence.daysOfWeek?.length ? `Repete toda ${recurrence.daysOfWeek.map(d => FULL_WEEKDAYS[d].split("-")[0]).join(", ")}` : "Repete semanalmente";
    } else if (recurrence.type === "monthly") text = "Repete mensalmente";
    else if (recurrence.type === "yearly") text = "Repete anualmente";
    else if (recurrence.type === "custom") {
      const unit = recurrence.intervalUnit === "days" ? "dia(s)" : recurrence.intervalUnit === "weeks" ? "semana(s)" : recurrence.intervalUnit === "months" ? "mês(es)" : "ano(s)";
      text = `Repete a cada ${recurrence.interval} ${unit}`;
    }
    if (recurrence.endType === "after_occurrences") text += ` por ${recurrence.occurrences} vezes`;
    else if (recurrence.endType === "on_date" && recurrence.endDate) text += ` até ${new Date(`${recurrence.endDate}T00:00:00`).toLocaleDateString("pt-BR")}`;
    return text;
  }, [recurrence]);

  const nextDates = useMemo(() => {
    if (recurrence.type === "never") return [];
    const today = new Date();
    return [1, 2, 3].map(i => {
      const next = new Date(today);
      next.setDate(today.getDate() + i * (recurrence.type === "weekly" ? 7 : 1));
      return next.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    });
  }, [recurrence.type]);

  return (
    <View style={{ gap: 14 }}>
      <Marginalia>Recorrência</Marginalia>
      <Segmented kind="stamp" options={RECURRENCE_OPTIONS} value={recurrence.type} onChange={changeType} />

      {recurrence.type === "custom" ? (
        <Card style={{ gap: 12 }}>
          <Input
            label="Repetir a cada"
            keyboardType="number-pad"
            value={String(recurrence.interval || 1)}
            onChangeText={v => onChange({ ...recurrence, interval: Math.max(1, parseInt(v, 10) || 1) })}
          />
          <Marginalia>Unidade</Marginalia>
          <Segmented kind="stamp" options={UNITS} value={recurrence.intervalUnit || "days"} onChange={u => onChange({ ...recurrence, intervalUnit: u })} />
          {recurrence.intervalUnit === "weeks" ? (
            <>
              <Marginalia>Dias da semana</Marginalia>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {WEEKDAYS.map(day => {
                  const on = (recurrence.daysOfWeek || []).includes(day.value);
                  return (
                    <Pressable
                      key={day.value}
                      onPress={() => toggleDay(day.value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={FULL_WEEKDAYS[day.value]}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: on ? theme.primary : theme.border,
                        backgroundColor: on ? theme.primarySoft : "transparent",
                      }}
                    >
                      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12 }} color={on ? theme.primaryInk : theme.inkMuted}>
                        {day.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      {recurrence.type !== "never" ? (
        <>
          <Marginalia>Término da recorrência</Marginalia>
          <Segmented kind="stamp" options={END_TYPES} value={recurrence.endType} onChange={changeEnd} />
          {recurrence.endType === "after_occurrences" ? (
            <Input
              label="Número de ocorrências"
              keyboardType="number-pad"
              value={String(recurrence.occurrences || 5)}
              onChangeText={v => onChange({ ...recurrence, occurrences: Math.max(1, parseInt(v, 10) || 1) })}
            />
          ) : null}
          {recurrence.endType === "on_date" ? (
            <>
              <Marginalia>Data de término</Marginalia>
              <DateStrip value={recurrence.endDate || ""} onChange={endDate => onChange({ ...recurrence, endDate })} daysBefore={0} daysAfter={365} />
            </>
          ) : null}

          <Card style={{ gap: 8, borderTopWidth: 2, borderTopColor: theme.primary }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="repeat" size={14} color={theme.primary} />
              <Txt variant="bodyStrong">Resumo</Txt>
            </View>
            <Txt variant="caption" muted>
              {preview}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Ionicons name="calendar-outline" size={12} color={theme.inkMuted} />
              <Txt variant="caption" muted>
                Próximas:
              </Txt>
              {nextDates.map(d => (
                <Stamp key={d} label={d} tone="violet" />
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </View>
  );
}
