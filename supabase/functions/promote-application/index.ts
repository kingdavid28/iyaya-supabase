// @ts-ignore - Deno runtime imports are supported in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Supabase client available via esm.sh in Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Deno global is available in the Edge Functions runtime
declare const Deno: any

type PromoteApplicationPayload = {
  applicationId?: string
  contractTerms?: Record<string, unknown> | null
  createdBy?: string | null
}

type PromoteApplicationResult = {
  application_id: string
  booking_id: string
  contract_id: string
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST'
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

const normalizeToken = (headerValue: string | null): string | null => {
  if (!headerValue) return null
  const value = headerValue.trim()
  if (!value) return null
  const parts = value.split(' ')
  if (parts.length === 2) {
    return parts[1]
  }
  return parts[0]
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      error: 'method_not_allowed',
      message: 'Only POST requests are supported.'
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration environment variables.')
      return jsonResponse(500, {
        error: 'configuration_error',
        message: 'Supabase environment variables are not configured.'
      })
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    const accessToken = normalizeToken(authHeader)

    if (!accessToken) {
      return jsonResponse(401, {
        error: 'unauthorized',
        message: 'Missing bearer token in Authorization header.'
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    if (userError || !userData?.user) {
      console.warn('⚠️ Unable to authenticate user via access token:', userError?.message)
      return jsonResponse(401, {
        error: 'unauthorized',
        message: 'Invalid or expired access token.'
      })
    }

    const requesterId = userData.user.id

    let payload: PromoteApplicationPayload
    try {
      payload = await req.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return jsonResponse(400, {
        error: 'invalid_payload',
        message: 'Request body must be valid JSON.'
      })
    }

    const applicationId = payload?.applicationId?.trim()
    if (!applicationId) {
      return jsonResponse(400, {
        error: 'missing_application_id',
        message: 'An applicationId field is required.'
      })
    }

    const contractTerms =
      payload?.contractTerms && typeof payload.contractTerms === 'object'
        ? payload.contractTerms
        : {}

    const { data: applicationRecord, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        status,
        job:jobs!inner(
          id,
          parent_id
        )
      `)
      .eq('id', applicationId)
      .maybeSingle()

    if (applicationError) {
      console.error('❌ Error fetching application record:', applicationError)
      return jsonResponse(500, {
        error: 'application_lookup_failed',
        message: 'Failed to look up the application record.'
      })
    }

    if (!applicationRecord) {
      return jsonResponse(404, {
        error: 'application_not_found',
        message: 'No application found for the provided identifier.'
      })
    }

    const parentId = applicationRecord.job?.parent_id
    if (!parentId || parentId !== requesterId) {
      console.warn('⚠️ Unauthorized promotion attempt. Requester:', requesterId, 'Parent:', parentId)
      return jsonResponse(403, {
        error: 'forbidden',
        message: 'You do not have permission to promote this application.'
      })
    }

    const eligibleStatuses = new Set(['pending', 'shortlisted', 'accepted'])
    const currentStatus = String(applicationRecord.status || '').toLowerCase()
    if (!eligibleStatuses.has(currentStatus)) {
      return jsonResponse(409, {
        error: 'invalid_application_status',
        message: `Application status "${currentStatus}" cannot be promoted.`
      })
    }

    const rpcInput = {
      p_application_id: applicationId,
      p_contract_terms: contractTerms,
      p_created_by: payload?.createdBy || requesterId
    }

    const { data: promotionResult, error: promotionError } = await supabaseAdmin.rpc(
      'promote_application_to_booking',
      rpcInput
    )

    if (promotionError) {
      console.error('❌ promote_application_to_booking RPC failed:', promotionError)
      return jsonResponse(500, {
        error: 'promotion_failed',
        message: promotionError.message || 'Unable to promote application. Please try again later.'
      })
    }

    const record: PromoteApplicationResult | undefined = Array.isArray(promotionResult)
      ? promotionResult[0]
      : promotionResult

    if (!record) {
      console.error('❌ RPC returned no data for promotion request:', rpcInput)
      return jsonResponse(500, {
        error: 'promotion_failed',
        message: 'Promotion completed with no response payload.'
      })
    }

    const applicationIdResult = record.application_id || applicationId
    let bookingIdResult = record.booking_id
    let contractIdResult = record.contract_id

    if (!bookingIdResult || !contractIdResult) {
      console.warn('⚠️ RPC returned missing IDs, attempting direct lookup...', record)
      const { data: fallbackApplication, error: fallbackError } = await supabaseAdmin
        .from('applications')
        .select('booking_id, contract_id')
        .eq('id', applicationIdResult)
        .maybeSingle()

      if (fallbackError) {
        console.error('❌ Failed to fetch fallback application data:', fallbackError)
        return jsonResponse(500, {
          error: 'promotion_failed',
          message: 'Promotion succeeded but failed to resolve booking/contract identifiers.'
        })
      }

      bookingIdResult = bookingIdResult || fallbackApplication?.booking_id || null
      contractIdResult = contractIdResult || fallbackApplication?.contract_id || null
    }

    if (!bookingIdResult || !contractIdResult) {
      console.error('❌ Promotion completed but booking/contract IDs are still missing', {
        rpcInput,
        record
      })
      return jsonResponse(500, {
        error: 'promotion_failed',
        message: 'Promotion completed but booking/contract identifiers were not returned. Please try again.'
      })
    }

    return jsonResponse(200, {
      success: true,
      applicationId: applicationIdResult,
      bookingId: bookingIdResult,
      contractId: contractIdResult
    })
  } catch (error) {
    console.error('❌ Unexpected error promoting application:', error)
    return jsonResponse(500, {
      error: 'internal_error',
      message: 'An unexpected error occurred while promoting the application.'
    })
  }
})