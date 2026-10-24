import { useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString, toYYYYMMDD } from "@/lib/store";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Mini calendário do mês (MiniCalendar de Tarefas e o do Financeiro no web).
export function MonthCalendar({
  value,
  onChange,
  dots,
  weekLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
  selectedStyle = "bold",
  arrowColor,
}: {
  value: string;
  onChange: (date: string) => void;
  dots?: (date: string) => string[];
  weekLabels?: string[];
  selectedStyle?: "bold" | "filled";
  arrowColor?: string;
}) {
  const theme = useTheme();
  const today = getTodayString();
  const [cursor, setCursor] = useState(() => new Date(`${value}T12:00:00`));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => toYYYYMMDD(new Date(year, month, i + 1))),
  ];

  const arrow = (icon: "chevron-back" | "chevron-forward", delta: number) => (
    <Pressable
      onPress={() => setCursor(new Date(year, month + delta, 1))}
      hitSlop={8}
      accessibilityLabel={delta < 0 ? "Mês anterior" : "Próximo mês"}
      style={
        arrowColor
          ? { padding: 4 }
          : { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }
      }
    >
      <Ionicons name={icon} size={16} color={arrowColor ?? theme.ink} />
    </Pressable>
  );

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {arrow("chevron-back", -1)}
        <Txt variant="h2" style={{ flex: 1, textAlign: "center" }}>
          {MONTHS[month]} {selectedStyle === "filled" ? "De " : ""}
          {year}
        </Txt>
        {arrow("chevron-forward", 1)}
      </View>
      <View style={{ flexDirection: "row" }}>
        {weekLabels.map((d, i) => (
          <Txt key={i} style={{ flex: 1, textAlign: "center", fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.6 }} muted>
            {d}
          </Txt>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const selected = key === value;
          const marks = dots?.(key) ?? [];
          return (
            <Pressable key={key} onPress={() => onChange(key)} style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  minWidth: 32,
                  height: 30,
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected && selectedStyle === "filled" ? theme.primary : "transparent",
                }}
              >
                <Txt
                  style={{ fontFamily: selected ? fonts.display : key === today ? fonts.bodyBold : fonts.bodyMedium, fontSize: selected ? 15 : 13 }}
                  color={selected && selectedStyle === "filled" ? "#fff" : selected ? theme.ink : key === today ? theme.primary : theme.ink}
                >
                  {Number(key.slice(8))}
                </Txt>
              </View>
              <View style={{ flexDirection: "row", gap: 2, height: 5 }}>
                {marks.slice(0, 3).map((c, j) => (
                  <View key={j} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
