import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload

    // Criar cliente Supabase com service role para buscar dados do perfil
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Buscar nome do usuário no perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', record.user_id)
      .single()

    const userName = profile?.name || 'Não informado'
    const userEmail = record.email
    const userId = record.user_id
    const reason = record.reason || 'Nenhum motivo informado'
    const createdAt = new Date(record.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Ascend <notifications@resend.dev>', // Substituir pelo domínio configurado em produção
        to: ['ascendprod1@gmail.com'],
        subject: `Nova Solicitação de Cancelamento - ${userName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Nova Solicitação de Cancelamento</h2>
            <p>Uma nova solicitação de cancelamento foi recebida através do sistema interno.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
              <p><strong>Nome:</strong> ${userName}</p>
              <p><strong>E-mail:</strong> ${userEmail}</p>
              <p><strong>ID do Usuário:</strong> ${userId}</p>
              <p><strong>Data da Solicitação:</strong> ${createdAt}</p>
              <p><strong>Motivo:</strong> ${reason}</p>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #777;">
              Este é um e-mail automático enviado pelo sistema Ascend.
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
