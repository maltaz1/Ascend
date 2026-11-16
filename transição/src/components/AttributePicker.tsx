import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Task } from "@/lib/store";
import { Marginalia, Txt } from "@/components/ui";
import { ACTION_LABEL, ATTR_ACTIONS, ATTRS, taskAttrXP, type ActionId, type AttrId } from "@/lib/attributes";
import { fonts, useTheme } from "@/theme";

// Etiqueta de atributo da tarefa: ao concluir, ela soma XP nesse atributo e avança as missões do ramo.
export function AttributePicker({
  attrId,
  action,
  onAttr,
  onAction,
  priority = "medium",
  what = "tarefa",
}: {
  attrId: AttrId | null;
  action: ActionId;
  onAttr: (id: AttrId | null) => void;
  onAction: (id: ActionId) => void;
  priority?: Task["priority"];
  what?: "tarefa" | "hábito";
}) {
  const theme = useTheme();
  const current = ATTRS.find(a => a.id === attrId);
  return (
    <>
      <Marginalia>Atributo</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ATTRS.map(a => {
          const on = a.id === attrId;
          return (
            <Pressable
              key={a.id}
              onPress={() => {
                onAttr(on ? null : a.id);
                if (!on) onAction(ATTR_ACTIONS[a.id][0]);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: on ? a.color : theme.border,
                backgroundColor: on ? `${a.color}2e` : "transparent",
              }}
            >
              <Ionicons name={a.icon as never} size={15} color={on ? a.ink : theme.inkMuted} />
              <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 12.5 }} color={on ? a.ink : theme.inkMuted}>
                {a.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {current ? (
        <>
          <Marginalia>Tipo de ação em {current.name}</Marginalia>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ATTR_ACTIONS[current.id].map(act => {
              const on = act === action;
              return (
                <Pressable
                  key={act}
                  onPress={() => onAction(act)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: on ? current.color : theme.border,
                    backgroundColor: on ? `${current.color}2e` : "transparent",
                  }}
                >
                  <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 12.5 }} color={on ? current.ink : theme.inkMuted}>
                    {ACTION_LABEL[act]}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Txt variant="caption" muted>
            {what === "hábito"
              ? `Cada dia marcado soma +${taskAttrXP({ priority })} XP em ${current.name} e avança as missões desse ramo na aba Eu.`
              : `Ao concluir, soma +${taskAttrXP({ priority })} XP em ${current.name} (a prioridade define o XP) e avança as missões desse ramo na aba Eu.`}
          </Txt>
        </>
      ) : (
        <Txt variant="caption" muted>
          Opcional. Escolha um atributo para {what === "hábito" ? "esse hábito" : "essa tarefa"} contar na aba Eu.
        </Txt>
      )}
    </>
  );
}

