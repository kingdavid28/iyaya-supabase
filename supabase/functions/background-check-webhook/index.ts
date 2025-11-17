// @ts-ignore - Deno imports are valid in Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface BackgroundCheckWebhookPayload {
  caregiver_user_id?: string
  user_id?: string
  status?: string
  check_status?: string
  result?: string
  report_id?: string
  expiry_date?: string | null
  notes?: string | null
}

function mapProviderStatus(rawStatus: string | undefined | null): string {
  if (!rawStatus) return 'pending'
  const status = rawStatus.toLowerCase()

  if (['clear', 'passed', 'approved'].includes(status)) {
    return 'approved'
  }

  if (['pending', 'in_progress', 'processing', 'queued'].includes(status)) {
    return 'pending'
  }

  if (['consider', 'failed', 'rejected', 'flagged', 'error'].includes(status)) {
    return 'failed'
  }

  return 'pending'
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const webhookSecret = Deno.env.get('BACKGROUND_CHECK_WEBHOOK_SECRET')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!webhookSecret) {
      console.error('Missing BACKGROUND_CHECK_WEBHOOK_SECRET')
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const bodyText = await req.text()
    let payload: BackgroundCheckWebhookPayload

    try {
      payload = JSON.parse(bodyText)
    } catch (e) {
      console.error('Invalid JSON payload', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = payload.caregiver_user_id || payload.user_id
    if (!userId) {
      console.error('Missing caregiver user id in payload', payload)
      return new Response(
        JSON.stringify({ error: 'Missing caregiver_user_id / user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const providerStatus = payload.status || payload.check_status || payload.result
    const mappedStatus = mapProviderStatus(providerStatus)

    const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  },
})

    const { data, error } = await supabase.rpc('update_caregiver_background_check_status', {
  p_user_id: userId,
  p_status: mappedStatus,
  p_report_id: payload.report_id ?? null,
  p_expiry_date: payload.expiry_date ?? null,
  p_notes: payload.notes ?? null,
})

if (error) {
  console.error('RPC error update_caregiver_background_check_status:', error)
  return new Response(
    JSON.stringify({
      error: 'Failed to update background check status',
      message: error.message ?? null,
      details: (error as any).details ?? null,
      hint: (error as any).hint ?? null,
      code: (error as any).code ?? null,
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('Unexpected error in background-check-webhook:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})