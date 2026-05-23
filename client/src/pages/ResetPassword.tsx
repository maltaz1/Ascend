// pages/ResetPassword.tsx

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Senha alterada com sucesso");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Nova senha</h1>

      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={updatePassword}>
        Alterar senha
      </button>
    </div>
  );
}