import { Alert as NativeAlert, Platform, type AlertButton } from "react-native";

// No react-native-web o Alert.alert não faz nada, então confirmações como "Excluir tarefa"
// e "Sair do treino" ficavam sem resposta. Na web usamos a caixa de confirmação do navegador;
// no celular continua o Alert nativo.
function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find(button => button.style === "cancel");
  const action = buttons?.find(button => button.style !== "cancel");
  if (!action) {
    window.alert(text);
    cancel?.onPress?.();
    return;
  }
  if (window.confirm(text)) action.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = {
  alert: Platform.OS === "web" ? webAlert : (...args: Parameters<typeof NativeAlert.alert>) => NativeAlert.alert(...args),
};
