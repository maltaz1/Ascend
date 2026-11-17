import { useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Input, Marginalia, Txt } from "@/components/ui";
import { useTheme } from "@/theme";

const STEP = 15;
const PRESETS = ["08:00", "12:00", "15:00", "18:00", "20:00"];

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMinutes = (total: number) => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** "Em 1h": daqui a uma hora, arredondado para o próximo quarto de hora. */
function inOneHour(): string {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes() + 60;
  return fromMinutes(Math.ceil(total / 15) * 15);
}

// Dígitos viram "HH:MM" enquanto a pessoa digita: "1830" → 18:30, "930" → 09:30, "9" → 09:00.
function parseDigits(digits: string): string | null {
  let h: number;
  let m: number;
  if (digits.length === 4) [h, m] = [Number(digits.slice(0, 2)), Number(digits.slice(2))];
  else if (digits.length === 3) [h, m] = [Number(digits[0]), Number(digits.slice(1))];
  else if (digits.length >= 1) [h, m] = [Number(digits), 0];
  else return null;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Horário opcional com o caminho mais curto: um toque num atalho (08:00, 12:00...), ou
// digitar direto ("1830"). Os botões − e + ficam só para o ajuste fino de 15 em 15 minutos.
export function TimeField({ value, onChange, label = "Horário (opcional)" }: { value: string | null; onChange: (next: string | null) => void; label?: string }) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value ?? "");
  // Quando o horário muda por fora (atalho, − ou +), o campo de digitar acompanha.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value ?? "");
  }

  const chips = [{ label: "Em 1h", time: inOneHour() }, ...PRESETS.map(time => ({ label: time, time }))];

  const type = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setDraft(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
    // Só aplica quando o horário já está completo e válido (4 dígitos); o resto fecha ao sair do campo.
    if (digits.length === 4) {
      const parsed = parseDigits(digits);
      if (parsed) onChange(parsed);
    } else if (digits.length === 0) {
      onChange(null);
    }
  };

  const finish = () => {
    const digits = draft.replace(/\D/g, "");
    const parsed = parseDigits(digits);
    if (parsed) onChange(parsed);
    setDraft(parsed ?? value ?? "");
  };

  return (
    <View style={{ gap: 10 }}>
      <Marginalia>{label}</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {chips.map(chip => {
          const selected = value === chip.time;
          return (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : chip.time)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: selected ? theme.primarySoft : "transparent",
              }}
            >
              <Txt variant="label" color={selected ? theme.primaryInk : theme.inkMuted}>
                {chip.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input
            boxed
            icon="time-outline"
            placeholder="Ou digite: 1830"
            value={draft}
            onChangeText={type}
            onBlur={finish}
            keyboardType="number-pad"
            maxLength={5}
            returnKeyType="done"
          />
        </View>
        {value ? (
          <>
            <Pressable accessibilityLabel="Antecipar 15 minutos" onPress={() => onChange(fromMinutes(toMinutes(value) - STEP))} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={30} color={theme.primary} />
            </Pressable>
            <Pressable accessibilityLabel="Adiar 15 minutos" onPress={() => onChange(fromMinutes(toMinutes(value) + STEP))} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={30} color={theme.primary} />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}
