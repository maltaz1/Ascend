import { Pressable, ScrollView, View } from "react-native";
import { getTodayString, toYYYYMMDD } from "@/lib/store";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

// Faixa horizontal de dias (substitui o MiniCalendar / input date do web).
export function DateStrip({
  value,
  onChange,
  daysBefore = 3,
  daysAfter = 24,
  marks,
}: {
  value: string;
  onChange: (date: string) => void;
  daysBefore?: number;
  daysAfter?: number;
  marks?: Set<string>;
}) {
  const theme = useTheme();
  const today = getTodayString();
  const start = new Date();
  start.setDate(start.getDate() - daysBefore);
  const days = Array.from({ length: daysBefore + daysAfter + 1 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      contentOffset={{ x: Math.max(0, (daysBefore - 1) * 60), y: 0 }}
    >
      {days.map(date => {
        const key = toYYYYMMDD(date);
        const selected = key === value;
        const isToday = key === today;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              width: 52,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: "center",
              gap: 2,
              backgroundColor: selected ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: selected ? theme.primary : isToday ? theme.primary : theme.border,
            }}
          >
            <Txt variant="caption" color={selected ? "#fff" : theme.inkMuted} style={{ textTransform: "capitalize" }}>
              {date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
            </Txt>
            <Txt style={{ fontFamily: fonts.display, fontSize: 18 }} color={selected ? "#fff" : theme.ink}>
              {date.getDate()}
            </Txt>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: marks?.has(key) ? (selected ? "#fff" : theme.accent) : "transparent",
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
