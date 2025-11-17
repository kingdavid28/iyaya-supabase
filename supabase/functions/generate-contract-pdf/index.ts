// @ts-ignore - Deno imports are valid in Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno imports are valid in Edge Functions runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
// @ts-ignore - pdf-lib is supported in the Edge Functions runtime via esm.sh
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?dts'
// @ts-ignore - fontkit adapter for pdf-lib custom fonts
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1'

// Deno global is available in Edge Functions runtime
declare const Deno: any

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContractData {
  id: string
  booking_id: string
  parent_id: string
  caregiver_id: string
  status: string
  terms: any
  parent_signed_at: string | null
  caregiver_signed_at: string | null
  created_at: string
  version: number
  booking: any
  parent: any
  caregiver: any
}

const FONT_REGULAR_URL = Deno.env.get('PDF_FONT_REGULAR_URL') ?? null
const FONT_BOLD_URL = Deno.env.get('PDF_FONT_BOLD_URL') ?? null

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Use service role key for database access (bypasses RLS for this function)
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Support both POST (with JSON body) and GET (with query params)
    let contractId: string | null = null
    let includeSignatures = true
    let locale = 'en-PH'

    if (req.method === 'POST') {
      const body = await req.json()
      contractId = body.contractId
      includeSignatures = body.includeSignatures ?? true
      locale = body.locale || 'en-PH'
    } else if (req.method === 'GET') {
      // GET requests are public - for opening contracts in browser
      const url = new URL(req.url)
      contractId = url.searchParams.get('contractId')
      includeSignatures = url.searchParams.get('includeSignatures') !== 'false'
      locale = url.searchParams.get('locale') || 'en-PH'
    }

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: 'Contract ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('📝 Fetching contract data for:', contractId)

    // Fetch contract with related data
    const { data: contract, error: contractError } = await supabase
      .from('job_contracts')
      .select(`
        *,
        booking:bookings(*),
        parent:users!job_contracts_parent_id_fkey(*),
        caregiver:users!job_contracts_caregiver_id_fkey(*)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      console.error('❌ Contract fetch error:', contractError)
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Contract data fetched successfully')

    // Generate PDF document
    const pdfBytes = await generateContractPdfDocument(contract as ContractData, includeSignatures, locale)

    const fileName = `contract-${contract.id}.pdf`
    const pdfBuffer = new Uint8Array(pdfBytes.length)
    pdfBuffer.set(pdfBytes)
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })

    return new Response(
      pdfBlob,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': String(pdfBytes.length),
        },
      }
    )
  } catch (error: any) {
    console.error('❌ Error generating PDF:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function fetchFontBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download font from ${url}: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

async function generateContractPdfDocument(contract: ContractData, includeSignatures: boolean, locale: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const pageWidth = 595.28 // A4 width (points)
  const pageHeight = 841.89 // A4 height (points)
  let page = pdfDoc.addPage([pageWidth, pageHeight])

  const margin = 50
  const maxWidth = pageWidth - margin * 2

  let regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  let boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  if (FONT_REGULAR_URL && FONT_BOLD_URL) {
    try {
      pdfDoc.registerFontkit(fontkit)
      const [regularFontBytes, boldFontBytes] = await Promise.all([
        fetchFontBytes(FONT_REGULAR_URL),
        fetchFontBytes(FONT_BOLD_URL)
      ])
      regularFont = await pdfDoc.embedFont(regularFontBytes, { subset: true })
      boldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true })
    } catch (fontError) {
      console.warn('⚠️ Custom PDF fonts unavailable, using standard fonts instead. Set PDF_FONT_REGULAR_URL and PDF_FONT_BOLD_URL with accessible .ttf files to enable custom fonts.', fontError?.message || fontError)
    }
  }

  const headingColor = rgb(14 / 255, 165 / 255, 233 / 255)
  const textColor = rgb(30 / 255, 41 / 255, 59 / 255)
  const subtleColor = rgb(100 / 255, 116 / 255, 139 / 255)

  let y = page.getHeight() - margin

  const addPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = page.getHeight() - margin
  }

  const ensureSpace = (space: number) => {
    if (y - space < margin) {
      addPage()
    }
  }

  const drawLine = (
    text: string,
    options: {
      font?: any
      size?: number
      color?: ReturnType<typeof rgb>
      indent?: number
      lineSpacing?: number
    } = {}
  ) => {
    const {
      font = regularFont,
      size = 11,
      color = textColor,
      indent = 0,
      lineSpacing = 6,
    } = options

    const safeText = sanitizeText(text)

    ensureSpace(size + lineSpacing)
    page.drawText(safeText, {
      x: margin + indent,
      y,
      font,
      size,
      color,
    })
    y -= size + lineSpacing
  }

  const wrapText = (text: string, font: any, size: number, availableWidth: number) => {
    const safeSource = sanitizeText(text)
    const words = safeSource.split(/\s+/).filter(Boolean)
    const lines: string[] = []

    let currentLine = ''

    const maxLineWidth = Math.max(1, availableWidth)

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const lineWidth = font.widthOfTextAtSize(testLine, size)

      if (lineWidth <= maxLineWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  const drawParagraph = (
    text: string,
    options: {
      font?: any
      size?: number
      color?: ReturnType<typeof rgb>
      indent?: number
      lineSpacing?: number
    } = {}
  ) => {
    const {
      font = regularFont,
      size = 11,
      color = textColor,
      indent = 0,
      lineSpacing = 6,
    } = options

    const lines = wrapText(text, font, size, maxWidth - indent)
    lines.forEach((line) => drawLine(line, { font, size, color, indent, lineSpacing }))
  }

  const addSectionHeader = (title: string) => {
    ensureSpace(40)
    drawLine(title, {
      font: boldFont,
      size: 14,
      color: headingColor,
      lineSpacing: 10,
    })
  }

  // Title
  ensureSpace(60)
  const title = 'Childcare Services Contract'
  const titleSize = 20
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize)
  page.drawText(title, {
    x: margin + (maxWidth - titleWidth) / 2,
    y,
    font: boldFont,
    size: titleSize,
    color: headingColor,
  })
  y -= titleSize + 12

  drawLine(`Contract ID: ${contract.id}`, { font: regularFont, size: 11, color: subtleColor, lineSpacing: 8 })
  drawLine(`Version ${contract.version}`, { font: regularFont, size: 11, color: subtleColor, lineSpacing: 16 })

  // Contract information
  addSectionHeader('Contract Information')
  const statusLabel = (contract.status || 'pending').replace(/_/g, ' ').toUpperCase()
  const contractInfo = [
    { label: 'Contract Status', value: statusLabel },
    { label: 'Created Date', value: formatDateValue(contract.created_at, locale, '—') },
    {
      label: 'Booking Date',
      value: formatDateValue(contract.booking?.date ?? null, locale, '—'),
    },
    {
      label: 'Total Amount',
      value: formatCurrencyValue(contract.booking?.total_amount ?? contract.terms?.totalAmount ?? 0, locale),
    },
  ]

  contractInfo.forEach(({ label, value }) => {
    drawLine(label, { font: boldFont, size: 11 })
    drawParagraph(value, { indent: 10, color: subtleColor, lineSpacing: 10 })
  })

  // Parties involved
  addSectionHeader('Parties Involved')
  const parentName = contract.parent?.name || contract.parent?.email || 'Parent'
  const caregiverName = contract.caregiver?.name || contract.caregiver?.email || 'Caregiver'
  drawLine('Parent / Guardian', { font: boldFont, size: 11 })
  drawParagraph(parentName, { indent: 10, color: subtleColor, lineSpacing: 10 })
  drawLine('Caregiver', { font: boldFont, size: 11 })
  drawParagraph(caregiverName, { indent: 10, color: subtleColor, lineSpacing: 16 })

  // Terms and conditions
  addSectionHeader('Terms and Conditions')
  const termsEntries = extractTermsList(contract.terms)
  if (termsEntries.length === 0) {
    drawParagraph('No terms provided.', { color: subtleColor })
  } else {
    termsEntries.forEach((term, index) => {
      drawParagraph(`${index + 1}. ${term}`, { indent: 4 })
    })
  }

  // Signatures
  if (includeSignatures) {
    addSectionHeader('Signatures')
    const signatures = [
      {
        role: 'Parent',
        name: parentName,
        date: formatDateValue(contract.parent_signed_at, locale, 'Pending'),
        status: contract.parent_signed_at ? 'Signed' : 'Pending',
      },
      {
        role: 'Caregiver',
        name: caregiverName,
        date: formatDateValue(contract.caregiver_signed_at, locale, 'Pending'),
        status: contract.caregiver_signed_at ? 'Signed' : 'Pending',
      },
    ]

    signatures.forEach(({ role, name, date, status }) => {
      drawLine(`${role} — ${status}`, {
        font: boldFont,
        size: 11,
        color: status === 'Signed' ? rgb(6 / 255, 95 / 255, 70 / 255) : rgb(146 / 255, 64 / 255, 14 / 255),
      })
      drawParagraph(`Name: ${name}`, { indent: 10, color: subtleColor })
      drawParagraph(`Date: ${date}`, { indent: 10, color: subtleColor, lineSpacing: 12 })
    })
  }

  // Footer
  addSectionHeader('Footer')
  drawParagraph('Iyaya — Childcare Services Platform', { font: boldFont })
  drawParagraph('This contract is digitally generated and managed through the Iyaya platform.', { color: subtleColor })
  drawParagraph(
    `Generated on ${new Date().toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    { color: subtleColor }
  )

  return await pdfDoc.save()
}

function sanitizeText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return ''

  let safe = String(input)
    .normalize('NFKD')
    .replace(/\u20b1/gi, 'PHP ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2018|\u2019|\u201a|\u201b/g, "'")
    .replace(/\u201c|\u201d|\u201e|\u201f/g, '"')
    .replace(/\u00a0/g, ' ')

  // Replace any remaining non-ASCII characters with a reasonable fallback
  safe = safe.replace(/[^\x20-\x7E]/g, '')

  return safe
}

function formatDateValue(dateString: string | null | undefined, locale: string, fallback: string): string {
  if (!dateString) return fallback
  try {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (error) {
    console.warn('⚠️ Failed to format date, using fallback:', error)
    return fallback
  }
}

function formatCurrencyValue(amount: number | string | null | undefined, locale: string): string {
  const numericAmount = Number(amount ?? 0)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount)
    return sanitizeText(`PHP ${formatted}`)
  } catch (error) {
    console.warn('⚠️ Failed to format currency, using fallback:', error)
    return sanitizeText(`PHP ${safeAmount.toFixed(2)}`)
  }
}

const DEFAULT_TERMS = [
  'Both parties agree to the terms outlined in this childcare services contract.',
  'The caregiver agrees to provide childcare services as specified in the booking details.',
  'The parent agrees to pay the agreed-upon amount for services rendered in a timely manner.',
  'Either party may cancel with appropriate notice as per platform policies.',
  'All services must comply with applicable local and national laws and regulations.',
  'Any disputes will be handled according to platform dispute resolution procedures.',
]

function extractTermsList(terms: any): string[] {
  if (!terms) return DEFAULT_TERMS

  if (Array.isArray(terms)) {
    const normalized = terms.map((term) => sanitizeText(String(term))).filter(Boolean)
    return normalized.length ? normalized : DEFAULT_TERMS
  }

  if (typeof terms === 'string') {
    return [terms]
  }

  if (typeof terms === 'object') {
    const entries = Object.entries(terms).map(([key, value]) =>
      sanitizeText(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    )
    return entries.length ? entries : DEFAULT_TERMS
  }

  return DEFAULT_TERMS
}