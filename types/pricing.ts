// ── Live Material Pricing engine types ──────────────────────────────────────

export type SupplierKey =
  | 'rexel'
  | 'haymans'
  | 'lawrence_hanson'
  | 'middys'
  | 'cnw'
  | 'ideal'
  | 'cw_electrical'
  | 'sparky_direct'
  | 'tradezone'
  | 'mm_electrical'
  | 'awm'
  | 'tle'
  | 'actrol'
  | 'samios'
  | 'reece_hvac'
  | 'kirby_hvac'
  // The registry accepts arbitrary keys so new wholesalers can be added
  // without touching this union.
  | (string & {})

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown'

export type ConnectionMethod = 'api' | 'catalogue' | 'browser'
export type SyncFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'manual'
export type SyncTrigger = 'manual' | 'scheduled' | 'import'
export type SyncStatus = 'running' | 'success' | 'failed'

export interface MasterProduct {
  id: string
  name: string
  category: string
  brand: string | null
  mpn: string | null
  unit: string
  description: string | null
  aliases: string[]
  created_at: string
  updated_at: string
}

export interface SupplierProduct {
  id: string
  master_product_id: string
  supplier_key: string
  supplier_name: string
  sku: string
  mpn: string | null
  price: number
  availability: Availability
  stock_level: number | null
  product_url: string | null
  image_url: string | null
  datasheet_url: string | null
  description: string | null
  pack_size: number
  retail_price: number | null
  gst_rate: number
  discontinued: boolean
  replacement_sku: string | null
  specs: Record<string, string>
  last_updated: string
}

export interface PriceSnapshot {
  id: string
  supplier_product_id: string
  price: number
  recorded_at: string
}

export interface PriceChange {
  id: string
  supplier_product_id: string
  master_product_id: string
  supplier_key: string
  old_price: number
  new_price: number
  pct_change: number
  recorded_at: string
}

export type SupplierAccountStatus = 'pending' | 'connected' | 'error' | 'disconnected'

export interface TenantSupplierAccount {
  id: string
  tenant_id: string
  supplier_key: string
  account_reference: string | null
  status: SupplierAccountStatus
  enabled: boolean
  connection_method: ConnectionMethod
  branch: string | null
  sync_frequency: SyncFrequency
  next_sync_at: string | null
  last_error: string | null
  products_synced: number
  last_synced_at: string | null
  created_at: string
}

export interface SyncRun {
  id: string
  tenant_id: string | null
  supplier_key: string
  method: ConnectionMethod
  trigger_type: SyncTrigger
  status: SyncStatus
  offers: number
  new_products: number
  price_changes: number
  errors: string[]
  source_file: string | null
  started_at: string
  finished_at: string | null
}

export interface MaterialKit {
  id: string
  tenant_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface MaterialKitItem {
  id: string
  kit_id: string
  master_product_id: string
  quantity: number
  sort_order: number
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export interface PurchaseOrder {
  id: string
  tenant_id: string
  job_id: string | null
  estimate_id: string | null
  supplier_key: string
  po_number: string
  status: PurchaseOrderStatus
  notes: string | null
  expected_delivery: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  master_product_id: string | null
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  received_quantity: number
}

export interface TenantTradePrice {
  id: string
  tenant_id: string
  supplier_product_id: string
  price: number
  last_updated: string
}

export type PriceSource =
  | 'market_average'
  | 'market_lowest'
  | 'market_median'
  | 'preferred_supplier'
  | 'cheapest_trade'
  | 'manual'

export interface TenantPricingSettings {
  tenant_id: string
  price_source: PriceSource
  preferred_supplier_key: string | null
  alert_threshold_pct: number
  auto_update_overrides: boolean
  updated_at: string
}

export interface TenantPriceOverride {
  id: string
  tenant_id: string
  master_product_id: string
  price: number
  note: string | null
  updated_at: string
}

export interface PriceAlert {
  id: string
  tenant_id: string
  master_product_id: string | null
  message: string
  pct_change: number | null
  supplier_key: string | null
  read: boolean
  created_at: string
}

// ── Derived/computed shapes ─────────────────────────────────────────────────

export interface MarketStats {
  lowest: number | null
  highest: number | null
  average: number | null
  median: number | null
  supplierCount: number
  trendPct7d: number | null
}

export type ConfidenceRating = 'high' | 'medium' | 'low'

/** Fully resolved price for a tenant, with provenance for transparency. */
export interface ResolvedPrice {
  masterProductId: string
  price: number | null
  source: PriceSource | 'trade' | 'override'
  sourceLabel: string          // e.g. "Median market price (6 suppliers)" or "Your Middy's trade price"
  supplierKey: string | null
  supplierName: string | null
  sku: string | null
  lastUpdated: string | null
  confidence: ConfidenceRating
  stats: MarketStats
}

export interface TrendWindows {
  pct7d: number | null
  pct30d: number | null
  pct90d: number | null
  pct365d: number | null
  historicalHigh: number | null
  historicalLow: number | null
  historicalAverage: number | null
}

/** What a supplier connector returns for one product on a refresh pass. */
export interface ConnectorOffer {
  sku: string
  name: string
  category?: string
  brand?: string
  mpn?: string
  unit?: string
  priceExGst: number
  availability?: Availability
  stockLevel?: number
  productUrl?: string
  /** Tenant-specific trade price, when the connector is running with a linked account. */
  tradePriceExGst?: number
  imageUrl?: string
  datasheetUrl?: string
  description?: string
  packSize?: number
  retailPriceExGst?: number
  gstRate?: number
  discontinued?: boolean
  replacementSku?: string
  specs?: Record<string, string>
}
