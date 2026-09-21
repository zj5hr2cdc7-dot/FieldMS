export const runtime = 'nodejs'

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/utils/supabase/server'
import { canUseFaultFinder } from '@/lib/trades'
import { validateMessages, checkRateLimit, AI_PROVENANCE_HEADERS } from '@/lib/ai-safety'

/**
 * FieldMS Fault Finder — electrical fault finding assistant.
 *
 * This is an electrical product only. The persona and the manual behind it are
 * the electrical edition, so access is restricted server-side to workspaces
 * that do electrical work. HVAC and air conditioning businesses get a 403;
 * there is no refrigeration mode.
 */

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge', 'fault-finder')

function buildSystemPrompt(): string {
  const persona = readFileSync(join(KNOWLEDGE_DIR, 'system_prompt.md'), 'utf-8')
  const manual = readFileSync(join(KNOWLEDGE_DIR, 'fault_finding_manual.md'), 'utf-8')
  return [persona, '\n\n---\n\n# FAULT FINDING MANUAL (full reference text)\n\n', manual].join('')
}

// Built once per server process. The manual is ~185KB and never changes at
// runtime, so there's no reason to hit the disk on every message.
let cachedPrompt: string | null = null
function getSystemPrompt(): string {
  if (!cachedPrompt) cachedPrompt = buildSystemPrompt()
  return cachedPrompt
}

export async function POST(request: Request) {
  try {
    const { messages: rawMessages, tenantId } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    // Rate limit before doing any work: each request prepends a ~185KB system
    // prompt, so an unbounded endpoint is a way to spend the API budget.
    const rate = checkRateLimit(user.id)
    if (!rate.ok) {
      return Response.json(
        { error: 'Too many requests. Wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    // The previous check was `Array.isArray(messages)` and nothing else, so
    // the caller controlled the entire conversation passed to the model —
    // including forged assistant turns. See lib/ai-safety.ts.
    const validated = validateMessages(rawMessages)
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 })
    }
    const messages = validated.messages

    // Trade entitlement, enforced here rather than in the UI: the client can
    // ask for anything, but only electrical workspaces are ever served the
    // fault finding manual. RLS restricts this read to tenants the caller is
    // a member of.
    let trades: string[] = []
    if (tenantId && typeof tenantId === 'string') {
      const { data } = await supabase
        .from('tenant_onboarding')
        .select('trades')
        .eq('tenant_id', tenantId)
        .maybeSingle()
      trades = data?.trades ?? []
    }

    if (!canUseFaultFinder(trades)) {
      return Response.json(
        {
          error:
            'FieldMS Fault Finder is available to electrical trades only. Add an electrical trade in your onboarding settings to enable it.',
        },
        { status: 403 }
      )
    }

    const client = getClient()
    if (!client) {
      return Response.json(
        { error: 'Fault Finder is not configured: add ANTHROPIC_API_KEY to .env.local and restart the server.' },
        { status: 500 }
      )
    }

    let systemPrompt: string
    try {
      systemPrompt = getSystemPrompt()
    } catch (err) {
      console.error('Failed to load Fault Finder knowledge base:', err)
      return Response.json(
        { error: 'Fault Finder knowledge base is missing. Expected knowledge/fault-finder on the server.' },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    let anthropicStream: ReturnType<typeof client.messages.stream>

    try {
      anthropicStream = client.messages.stream({
        model: 'claude-sonnet-5',
        // The persona answers in a fixed six section format (understanding,
        // ranked causes, next step, expected result, interpretation,
        // confidence). 1024 tokens truncated that mid answer.
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
      })
    } catch (err) {
      console.error('Failed to create Anthropic stream:', err)
      return Response.json({ error: 'Fault Finder unavailable' }, { status: 500 })
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          console.error('Anthropic stream error:', err)
          controller.enqueue(encoder.encode('\n\n[Fault Finder error, please try again]'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        // Provenance travels with the response. The body is a plain text
        // stream, so headers are the only place to put it without changing
        // the wire format the client already parses.
        ...AI_PROVENANCE_HEADERS,
        'X-FieldMS-Model': 'claude-sonnet-5',
        'X-FieldMS-Generated-At': new Date().toISOString(),
      },
    })
  } catch (err: unknown) {
    console.error('Fault Finder API error:', err)
    return Response.json({ error: 'Fault Finder unavailable' }, { status: 500 })
  }
}
