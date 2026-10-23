import { useState } from "react";
import { Linking, Pressable, Switch, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notifications";
import { Button, Card, Input, Screen, Segmented, Txt } from "@/components/ui";
import { Logo } from "@/components/Brand";
import { useTheme } from "@/theme";

// Site web: usado nos links de termos e nos e-mails de confirmação/recuperação.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

type Mode = "login" | "signup";

// Mesmas regras de client/src/pages/Login.tsx.
export default function LoginScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      notifyError(error.message);
      setLoading(false);
      return;
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      notifyWarning("Você precisa confirmar seu e-mail antes de entrar.");
    }
    // Com sessão válida o layout raiz troca para as abas sozinho.
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!acceptTerms) {
      notifyWarning("Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.");
      return;
    }
    const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password)) {
      notifyError("Senha inválida", "Use pelo menos 8 caracteres, 1 letra maiúscula, 1 minúscula e 1 número.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name }, emailRedirectTo: WEB_URL },
    });
    setLoading(false);

    if (error) {
      notifyError(error.message);
      return;
    }
    notifySuccess("Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.");
    setMode("login");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      notifyWarning("Digite seu e-mail primeiro.");
      return;
    }
    setLoading(true);
    // A troca de senha acontece na página /reset-password do site.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: WEB_URL ? `${WEB_URL}/reset-password` : undefined,
    });
    setLoading(false);
    if (error) notifyError(error.message);
    else notifySuccess("E-mail de recuperação enviado!");
  };

  const openWeb = (path: string) => {
    if (WEB_URL) void Linking.openURL(`${WEB_URL}${path}`);
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 40, marginBottom: 12, gap: 14 }}>
        <Logo size={88} wordmark={false} />
        <Logo size={34} wordmark />
        <Txt muted style={{ textAlign: "center" }}>
          Produtividade gamificada.{"\n"}Sua rotina, um nível de cada vez.
        </Txt>
      </View>

      <Card style={{ gap: 14 }}>
        <Segmented
          options={[
            { value: "login", label: "Entrar" },
            { value: "signup", label: "Criar conta" },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === "signup" && <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} autoComplete="name" />}
        <Input
          label="E-mail"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {mode === "signup" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Switch value={acceptTerms} onValueChange={setAcceptTerms} trackColor={{ true: theme.primary }} />
            <Txt variant="label" muted style={{ flex: 1 }}>
              Aceito os{" "}
              <Txt variant="label" color={theme.primary} onPress={() => openWeb("/terms")}>
                Termos de Uso
              </Txt>{" "}
              e a{" "}
              <Txt variant="label" color={theme.primary} onPress={() => openWeb("/privacy")}>
                Política de Privacidade
              </Txt>
            </Txt>
          </View>
        )}

        <Button
          label={mode === "login" ? "Entrar" : "Criar conta"}
          onPress={mode === "login" ? handleLogin : handleSignup}
          loading={loading}
        />

        {mode === "login" && (
          <Pressable onPress={handleForgotPassword} style={{ alignItems: "center", paddingVertical: 4 }}>
            <Txt variant="label" color={theme.primary}>
              Esqueci a senha
            </Txt>
          </Pressable>
        )}
      </Card>
    </Screen>
  );
}
