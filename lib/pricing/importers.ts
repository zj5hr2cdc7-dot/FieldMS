/**
 * Tier 2 — catalogue / price-book importers.
 *
 * Wholesalers hand out price books in wildly different shapes. These parsers
 * turn CSV, TSV, JSON and simple XML exports into `ConnectorOffer[]` so the
 * sync engine treats an uploaded file exactly like an API response.
 *
 * Column names are matched loosely (case/space/punctuation-insensitive) and
 * many aliases are recognised — "Item Code", "Product Code", "SKU", …
 */

import type { Availability, ConnectorOffer } from '@/types/pricing'

// ── Header aliases ──────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  sku: ['sku', 'itemcode', 'productcode', 'stockcode', 'code', 'itemnumber', 'partno', 'catalogueno'],
  name: ['name', 'productname', 'description', 'itemdescription', 'title', 'product'],
  brand: ['brand', 'manufacturer', 'make', 'vendor'],
  mpn: ['mpn', 'manufacturerpartnumber', 'mfrpart', 'partnumber', 'manufacturercode', 'supplierpart'],
  category: ['category', 'group', 'productgroup', 'department', 'class'],
  unit: ['unit', 'uom', 'unitofmeasure', 'sellunit'],
  packSize: ['packsize', 'pack', 'packqty', 'cartonqty', 'multiple'],
  price: ['price', 'tradeprice', 'yourprice', 'netprice', 'costprice', 'buyprice', 'priceexgst', 'exgst', 'net', 'cost'],
  retailPrice: ['retailprice', 'rrp', 'listprice', 'list', 'recommendedretail', 'grossprice'],
  stockLevel: ['stock', 'stocklevel', 'qtyonhand', 'soh', 'available', 'availableqty'],
  availability: ['availability', 'stockstatus', 'status'],
  imageUrl: ['image', 'imageurl', 'imagelink', 'picture', 'photourl'],
  datasheetUrl: ['datasheet', 'datasheeturl', 'specsheet', 'pdf', 'documenturl'],
  productUrl: ['url', 'producturl', 'link', 'weblink'],
  description: ['longdescription', 'fulldescription', 'details', 'productdescription'],
  discontinued: ['discontinued', 'obsolete', 'endoflife', 'eol'],
  replacementSku: ['replacement', 'replacementsku', 'supersededby', 'substitute'],
  gstRate: ['gst', 'gstrate', 'taxrate'],
}

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function mapHeaders(headers: string[]): Map<number, string> {
  const map = new Map<number, string>()
  headers.forEach((h, i) => {
    const n = normHeader(h)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(n) && ![...map.values()].includes(field)) {
        map.set(i, field)
        break
      }
    }
  })
  return map
}

// ── Value coercion ──────────────────────────────────────────────────────────

function toNumber(v: string | undefined): number | undefined {
  if (v == null) return undefined
  const n = Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function toBool(v: string | undefined): boolean | undefined {
  if (v == null || v === '') return undefined
  return ['y', 'yes', 'true', '1', 'discontinued', 'obsolete'].includes(String(v).trim().toLowerCase())
}

function toAvailability(v: string | undefined, stock: number | undefined): Availability | undefined {
  if (v) {
    const n = String(v).toLowerCase()
    if (/(in ?stock|available|^instock$)/.test(n)) return 'in_stock'
    if (/low/.test(n)) return 'low_stock'
    if (/(out|unavailable|no ?stock|backorder)/.test(n)) return 'out_of_stock'
  }
  if (stock !== undefined) return stock <= 0 ? 'out_of_stock' : stock < 5 ? 'low_stock' : 'in_stock'
  return undefined
}

function rowToOffer(fields: Record<string, string>): ConnectorOffer | null {
  const sku = fields.sku?.trim()
  const name = fields.name?.trim()
  const price = toNumber(fields.price)
  if (!sku || !name || price === undefined || price < 0) return null

  const stockLevel = toNumber(fields.stockLevel)
  const offer: ConnectorOffer = {
    sku,
    name,
    priceExGst: price,
    tradePriceExGst: price, // catalogue imports carry the customer's own pricing
    brand: fields.brand?.trim() || undefined,
    mpn: fields.mpn?.trim() || undefined,
    category: fields.category?.trim() || undefined,
    unit: fields.unit?.trim() || undefined,
    packSize: toNumber(fields.packSize),
    retailPriceExGst: toNumber(fields.retailPrice),
    stockLevel: stockLevel !== undefined ? Math.round(stockLevel) : undefined,
    availability: toAvailability(fields.availability, stockLevel),
    imageUrl: fields.imageUrl?.trim() || undefined,
    datasheetUrl: fields.datasheetUrl?.trim() || undefined,
    productUrl: fields.productUrl?.trim() || undefined,
    description: fields.description?.trim() || undefined,
    discontinued: toBool(fields.discontinued),
    replacementSku: fields.replacementSku?.trim() || undefined,
    gstRate: toNumber(fields.gstRate),
  }
  return offer
}

// ── CSV / TSV ───────────────────────────────────────────────────────────────

/** RFC-4180-ish parser: quoted fields, escaped quotes, CRLF. */
export function parseDelimited(text: string, delimiter: ',' | '\t' | ';'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell); cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

function importDelimited(text: string, delimiter: ',' | '\t' | ';'): ImportResult {
  const rows = parseDelimited(text, delimiter)
  if (rows.length < 2) return { offers: [], skipped: 0, warnings: ['File has no data rows.'] }

  const headerMap = mapHeaders(rows[0])
  if (![...headerMap.values()].includes('sku') || ![...headerMap.values()].includes('price')) {
    return {
      offers: [],
      skipped: rows.length - 1,
      warnings: [`Could not find SKU and price columns. Headers seen: ${rows[0].join(', ')}`],
    }
  }

  const offers: ConnectorOffer[] = []
  let skipped = 0
  for (const row of rows.slice(1)) {
    const fields: Record<string, string> = {}
    headerMap.forEach((field, idx) => { fields[field] = row[idx] ?? '' })
    const offer = rowToOffer(fields)
    if (offer) offers.push(offer)
    else skipped++
  }
  return { offers, skipped, warnings: [] }
}

// ── JSON ────────────────────────────────────────────────────────────────────

function importJson(text: string): ImportResult {
  let data: unknown
  try { data = JSON.parse(text) } catch { return { offers: [], skipped: 0, warnings: ['Invalid JSON.'] } }

  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null
      ? (Object.values(data).find(Array.isArray) as unknown[] | undefined) ?? []
      : []
  if (!list.length) return { offers: [], skipped: 0, warnings: ['No product array found in JSON.'] }

  const offers: ConnectorOffer[] = []
  let skipped = 0
  for (const item of list) {
    if (typeof item !== 'object' || item === null) { skipped++; continue }
    const record = item as Record<string, unknown>
    const fields: Record<string, string> = {}
    for (const [k, v] of Object.entries(record)) {
      const n = normHeader(k)
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.includes(n) && !(field in fields)) fields[field] = String(v ?? '')
      }
    }
    const offer = rowToOffer(fields)
    if (offer) offers.push(offer)
    else skipped++
  }
  return { offers, skipped, warnings: [] }
}

// ── XML (simple <product>/<item> element feeds) ─────────────────────────────

function importXml(text: string): ImportResult {
  const itemRe = /<(product|item|row)\b[^>]*>([\s\S]*?)<\/\1>/gi
  const tagRe = /<([a-zA-Z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g
  const offers: ConnectorOffer[] = []
  let skipped = 0
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(text))) {
    const inner = m[2]
    const fields: Record<string, string> = {}
    let t: RegExpExecArray | null
    while ((t = tagRe.exec(inner))) {
      const n = normHeader(t[1])
      const value = t[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.includes(n) && !(field in fields)) fields[field] = value
      }
    }
    const offer = rowToOffer(fields)
    if (offer) offers.push(offer)
    else skipped++
  }
  if (!offers.length && !skipped) return { offers: [], skipped: 0, warnings: ['No <product>/<item>/<row> elements found.'] }
  return { offers, skipped, warnings: [] }
}

// ── Entry point ─────────────────────────────────────────────────────────────

export interface ImportResult {
  offers: ConnectorOffer[]
  skipped: number
  warnings: string[]
}

/**
 * Parse a catalogue file by name/content. Supports .csv, .tsv, .txt, .json,
 * .xml. (.xlsx exports should be saved as CSV — the UI says so.)
 */
export function parseCatalogue(filename: string, content: string): ImportResult {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  if (ext === 'json') return importJson(content)
  if (ext === 'xml') return importXml(content)
  if (ext === 'tsv' || content.split('\n')[0]?.includes('\t')) return importDelimited(content, '\t')
  if (ext === 'csv' || ext === 'txt') {
    // Some ERP exports use semicolons
    const firstLine = content.split('\n')[0] ?? ''
    const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ','
    return importDelimited(content, delim as ',' | ';')
  }
  // Fall back to sniffing
  if (content.trimStart().startsWith('{') || content.trimStart().startsWith('[')) return importJson(content)
  if (content.trimStart().startsWith('<')) return importXml(content)
  return importDelimited(content, ',')
}
