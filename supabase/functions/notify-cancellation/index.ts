import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const CAKTO_API_KEY = Deno.env.get('CAKTO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { record } = payload

    // Criar cliente Supabase com service role para buscar dados do perfil e atualizar status
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Buscar nome do usuário e ID da assinatura da Cakto no perfil
    // Assumimos que o ID da assinatura da Cakto está salvo no perfil (ex: cakto_subscription_id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, cakto_subscription_id')
      .eq('id', record.user_id)
      .single()

    const userName = profile?.name || 'Não informado'
    const caktoSubscriptionId = profile?.cakto_subscription_id
    const userEmail = record.email
    const userId = record.user_id
    const reason = record.reason || 'Nenhum motivo informado'
    const createdAt = new Date(record.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    let caktoResult = { success: false, message: 'ID da assinatura não encontrado no perfil' }

    // 2. Tentar cancelar na Cakto se tivermos o ID da assinatura
    if (caktoSubscriptionId && CAKTO_API_KEY) {
      try {
        const caktoResponse = await fetch(`https://api.cakto.com.br/public_api/subscriptions/${caktoSubscriptionId}/cancel/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CAKTO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (caktoResponse.ok) {
          caktoResult = { success: true, message: 'Assinatura cancelada com sucesso na Cakto' }
          
          // Atualizar status no banco de dados para processado
          await supabase
            .from('cancellation_requests')
            .update({ 
              status: 'processed', 
              processed_at: new Date().toISOString() 
            })
            .eq('id', record.id)
            
          // Opcional: Remover flag is_pro do usuário
          await supabase
            .from('profiles')
            .update({ is_pro: false })
            .eq('id', record.user_id)
            
        } else {
          const errorData = await caktoResponse.json()
          caktoResult = { success: false, message: `Erro na Cakto: ${errorData.detail || caktoResponse.statusText}` }
        }
      } catch (e) {
        caktoResult = { success: false, message: `Falha na comunicação com a Cakto: ${e.message}` }
      }
    }

    // 3. Enviar notificação por e-mail (Resend)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Ascend <notifications@resend.dev>',
        to: ['ascendprod1@gmail.com'],
        subject: `[${caktoResult.success ? 'AUTO' : 'MANUAL'}] Solicitação de Cancelamento - ${userName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Solicitação de Cancelamento</h2>
            <p>Uma nova solicitação de cancelamento foi recebida.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px;">
              <p><strong>Status da Automação:</strong> ${caktoResult.success ? '<span style="color: green;">SUCESSO (Cancelado na Cakto)</span>' : '<span style="color: red;">FALHA (Requer ação manual)</span>'}</p>
              <p><strong>Detalhe:</strong> ${caktoResult.message}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
              <p><strong>Nome:</strong> ${userName}</p>
              <p><strong>E-mail:</strong> ${userEmail}</p>
              <p><strong>ID do Usuário:</strong> ${userId}</p>
              <p><strong>Cakto Subscription ID:</strong> ${caktoSubscriptionId || 'N/A'}</p>
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

    return new Response(JSON.stringify({ cakto: caktoResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
