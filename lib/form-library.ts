/**
 * Built-in form library — professionally structured templates for Australian
 * trade businesses. Templates live in code and are copied into a tenant when
 * used, so businesses can freely customise their copy without affecting the
 * library. Adding a new template = adding data here; no core changes needed.
 */

import type { FormField, FormTemplateSchema, LibraryTemplate } from '@/types/forms'
import { createTemplate } from '@/lib/forms'
import type { FormTemplate } from '@/types/forms'

// ── Tiny DSL so each template stays readable ────────────────────────────────

let seq = 0
const uid = (prefix: string) => `${prefix}_${(seq++).toString(36)}`

const f = (partial: Omit<FormField, 'id'> & { id?: string }): FormField => ({
  id: partial.id ?? uid(partial.type),
  ...partial,
})

const heading = (label: string) => f({ type: 'heading', label })
const para = (label: string) => f({ type: 'paragraph', label })
const divider = () => f({ type: 'divider', label: '' })
const text = (label: string, opts: Partial<FormField> = {}) => f({ type: 'text', label, ...opts })
const textarea = (label: string, opts: Partial<FormField> = {}) => f({ type: 'textarea', label, ...opts })
const date = (label: string, opts: Partial<FormField> = {}) => f({ type: 'date', label, ...opts })
const time = (label: string, opts: Partial<FormField> = {}) => f({ type: 'time', label, ...opts })
const num = (label: string, opts: Partial<FormField> = {}) => f({ type: 'number', label, ...opts })
const select = (label: string, options: string[], opts: Partial<FormField> = {}) => f({ type: 'select', label, options, ...opts })
const checkbox = (label: string, opts: Partial<FormField> = {}) => f({ type: 'checkbox', label, ...opts })
const passfail = (label: string, opts: Partial<FormField> = {}) => f({ type: 'passfail', label, ...opts })
const photo = (label: string, opts: Partial<FormField> = {}) => f({ type: 'photo', label, ...opts })
const gps = () => f({ type: 'gps', label: 'Site GPS location', autofill: 'gps.current' })
const table = (label: string, columns: { key: string; label: string; type: 'text' | 'number' | 'passfail' }[], opts: Partial<FormField> = {}) =>
  f({ type: 'table', label, columns, ...opts })
const sign = (label: string, role: FormField['signatureRole']) => f({ type: 'signature', label, signatureRole: role, required: true })

// Shared blocks
const jobHeaderBlock = (): FormField[] => [
  text('Customer', { autofill: 'job.customer_name', required: true }),
  text('Site address', { autofill: 'job.customer_address', required: true }),
  text('Job number', { autofill: 'job.number' }),
  date('Date', { autofill: 'date.today', required: true }),
  text('Technician', { autofill: 'technician.name', required: true }),
  text('Licence no.', { autofill: 'business.electrical_license' }),
]

const testResultsTable = () =>
  table('Circuit test results', [
    { key: 'circuit', label: 'Circuit', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'earth_ohms', label: 'Earth cont. (Ω)', type: 'number' },
    { key: 'insulation_mohms', label: 'Insul. res. (MΩ)', type: 'number' },
    { key: 'polarity', label: 'Polarity', type: 'passfail' },
    { key: 'rcd_ms', label: 'RCD (ms)', type: 'number' },
  ], { minRows: 3, required: true })

const schema = (...fields: (FormField | FormField[])[]): FormTemplateSchema => ({ fields: fields.flat() })

// ── Electrical templates ────────────────────────────────────────────────────

const electrical: LibraryTemplate[] = [
  {
    key: 'certificate-electrical-safety',
    name: 'Certificate of Electrical Safety',
    category: 'electrical',
    description: 'Certifies electrical work is safe and compliant with AS/NZS 3000.',
    doc_prefix: 'CES',
    schema: schema(
      heading('Certificate of Electrical Safety'),
      para('Issued in accordance with AS/NZS 3000 (Wiring Rules) and applicable state regulations.'),
      jobHeaderBlock(),
      divider(),
      textarea('Description of electrical work', { required: true, autofill: 'job.description' }),
      select('Type of work', ['New installation', 'Alteration/addition', 'Repair', 'Periodic verification'], { required: true }),
      testResultsTable(),
      passfail('Installation safe to energise', { required: true }),
      textarea('Defects or limitations noted'),
      photo('Photo evidence'),
      gps(),
      divider(),
      para('I certify that the electrical installation, to the extent it is affected by the work described, has been tested and complies with AS/NZS 3000.'),
      sign('Licensed electrician signature', 'technician'),
      sign('Customer acknowledgement', 'customer')
    ),
  },
  {
    key: 'certificate-of-compliance',
    name: 'Certificate of Compliance — Electrical Work (CCEW)',
    category: 'electrical',
    description: 'NSW-style compliance certificate for completed electrical work.',
    doc_prefix: 'CCEW',
    schema: schema(
      heading('Certificate of Compliance — Electrical Work'),
      jobHeaderBlock(),
      text('Contractor licence', { autofill: 'business.license', required: true }),
      divider(),
      textarea('Description of work carried out', { required: true, autofill: 'job.description' }),
      num('Number of circuits tested'),
      testResultsTable(),
      checkbox('Work complies with AS/NZS 3000', { required: true }),
      checkbox('Safety and compliance test completed', { required: true }),
      textarea('Notes'),
      sign('Licensed electrician signature', 'technician')
    ),
  },
  {
    key: 'testing-verification-sheet',
    name: 'Testing & Verification Sheet',
    category: 'electrical',
    description: 'Full AS/NZS 3000 Section 8 test record: continuity, insulation, polarity, EFLI, RCD.',
    doc_prefix: 'TVS',
    schema: schema(
      heading('Testing & Verification Sheet'),
      jobHeaderBlock(),
      text('Switchboard location'),
      select('Supply type', ['230V single phase', '400V three phase', 'SWER', 'Other']),
      divider(),
      table('Test results', [
        { key: 'circuit', label: 'Circuit', type: 'text' },
        { key: 'continuity', label: 'Continuity (Ω)', type: 'number' },
        { key: 'insulation', label: 'Insulation (MΩ)', type: 'number' },
        { key: 'polarity', label: 'Polarity', type: 'passfail' },
        { key: 'efli', label: 'EFLI (Ω)', type: 'number' },
        { key: 'rcd_ms', label: 'RCD trip (ms)', type: 'number' },
        { key: 'rcd_ma', label: 'RCD test (mA)', type: 'number' },
      ], { minRows: 5, required: true }),
      text('Test instrument make/model', { required: true }),
      date('Instrument last calibrated'),
      passfail('All results within limits', { required: true }),
      sign('Tested by', 'technician')
    ),
  },
  {
    key: 'switchboard-inspection',
    name: 'Switchboard Inspection Report',
    category: 'electrical',
    description: 'Condition inspection of switchboards, protection devices and labelling.',
    doc_prefix: 'SBI',
    schema: schema(
      heading('Switchboard Inspection Report'),
      jobHeaderBlock(),
      text('Switchboard location', { required: true }),
      divider(),
      passfail('Enclosure condition acceptable'),
      passfail('No asbestos panel present / suspected'),
      passfail('Circuit protection adequate (MCB/RCBO)'),
      passfail('RCD protection fitted to required circuits'),
      passfail('Circuits legibly labelled'),
      passfail('No thermal damage or discolouration'),
      passfail('Adequate clearance and access'),
      passfail('Earthing conductor sized correctly'),
      textarea('Defects found'),
      select('Overall condition', ['Good', 'Fair', 'Poor — remediation recommended', 'Unsafe — immediate action required'], { required: true }),
      photo('Switchboard photos', { required: true }),
      sign('Inspector signature', 'technician')
    ),
  },
  {
    key: 'rcd-testing-report',
    name: 'RCD Testing Report',
    category: 'electrical',
    description: 'Push-button and trip-time testing per AS/NZS 3760 & AS/NZS 3000.',
    doc_prefix: 'RCD',
    schema: schema(
      heading('RCD Testing Report'),
      jobHeaderBlock(),
      table('RCD test results', [
        { key: 'location', label: 'Location/board', type: 'text' },
        { key: 'circuit', label: 'Circuit', type: 'text' },
        { key: 'type', label: 'RCD type', type: 'text' },
        { key: 'rating_ma', label: 'Rating (mA)', type: 'number' },
        { key: 'pushbutton', label: 'Push-button', type: 'passfail' },
        { key: 'trip_ms', label: 'Trip time (ms)', type: 'number' },
        { key: 'result', label: 'Result', type: 'passfail' },
      ], { minRows: 3, required: true }),
      passfail('All RCDs compliant', { required: true }),
      textarea('Failed devices & action taken'),
      sign('Tested by', 'technician')
    ),
  },
  {
    key: 'smoke-alarm-compliance',
    name: 'Smoke Alarm Compliance Report',
    category: 'electrical',
    description: 'Smoke alarm installation/testing compliance for AS 3786.',
    doc_prefix: 'SAC',
    schema: schema(
      heading('Smoke Alarm Compliance Report'),
      jobHeaderBlock(),
      table('Alarms', [
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'type', label: 'Type (photoelectric/ionisation)', type: 'text' },
        { key: 'power', label: 'Power (240V/battery)', type: 'text' },
        { key: 'expiry', label: 'Expiry date', type: 'text' },
        { key: 'tested', label: 'Tested', type: 'passfail' },
      ], { minRows: 2, required: true }),
      checkbox('Alarms interconnected where required'),
      checkbox('Locations comply with regulations', { required: true }),
      passfail('Property compliant', { required: true }),
      photo('Photos'),
      sign('Technician signature', 'technician'),
      sign('Customer / agent acknowledgement', 'customer')
    ),
  },
  {
    key: 'solar-installation-checklist',
    name: 'Solar Installation Checklist',
    category: 'electrical',
    description: 'PV system installation & commissioning checks (AS/NZS 5033).',
    doc_prefix: 'SOL',
    schema: schema(
      heading('Solar Installation Checklist'),
      jobHeaderBlock(),
      num('System size (kW)', { required: true }),
      text('Inverter make/model', { required: true }),
      num('Number of panels'),
      divider(),
      checkbox('Array mounting & roof penetrations sealed'),
      checkbox('DC isolators installed & labelled'),
      checkbox('AC isolator installed & labelled'),
      checkbox('Signage installed at switchboard'),
      checkbox('Anti-islanding verified'),
      checkbox('Earthing of array frame verified'),
      num('Voc measured (V)'),
      num('Isc measured (A)'),
      passfail('System commissioned & exporting', { required: true }),
      photo('Installation photos', { required: true }),
      sign('Installer (CEC accredited)', 'technician'),
      sign('Customer handover', 'customer')
    ),
  },
  {
    key: 'ev-charger-installation',
    name: 'EV Charger Installation Report',
    category: 'electrical',
    description: 'EVSE installation record including load management and RCD type.',
    doc_prefix: 'EVC',
    schema: schema(
      heading('EV Charger Installation Report'),
      jobHeaderBlock(),
      text('Charger make/model', { required: true }),
      num('Rated current (A)', { required: true }),
      select('RCD protection', ['Type B RCD', 'Type A + DC 6mA detection', 'Integrated in EVSE'], { required: true }),
      checkbox('Dedicated circuit installed', { required: true }),
      checkbox('Load management configured'),
      num('Measured EFLI at charge point (Ω)'),
      passfail('Functional charge test', { required: true }),
      photo('Installation photos'),
      sign('Installer signature', 'technician'),
      sign('Customer handover', 'customer')
    ),
  },
  {
    key: 'defect-report',
    name: 'Electrical Defect Report',
    category: 'electrical',
    description: 'Formal notice of electrical defects found on site.',
    doc_prefix: 'DEF',
    schema: schema(
      heading('Electrical Defect Report'),
      jobHeaderBlock(),
      table('Defects identified', [
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'defect', label: 'Defect', type: 'text' },
        { key: 'risk', label: 'Risk (Low/Med/High)', type: 'text' },
        { key: 'action', label: 'Recommended action', type: 'text' },
      ], { minRows: 2, required: true }),
      select('Overall risk rating', ['Low', 'Medium', 'High — rectify promptly', 'Extreme — isolated on the spot'], { required: true }),
      checkbox('Customer notified of defects', { required: true }),
      photo('Defect photos', { required: true }),
      sign('Technician signature', 'technician'),
      sign('Customer acknowledgement', 'customer')
    ),
  },
  {
    key: 'service-callout-report',
    name: 'Service / Emergency Callout Report',
    category: 'electrical',
    description: 'Fault, diagnosis and rectification record for service calls.',
    doc_prefix: 'SVC',
    schema: schema(
      heading('Service Report'),
      jobHeaderBlock(),
      time('Arrival time', { autofill: 'time.now' }),
      textarea('Reported fault', { required: true, autofill: 'job.description' }),
      textarea('Diagnosis', { required: true }),
      textarea('Work performed', { required: true }),
      table('Materials used', [
        { key: 'item', label: 'Item', type: 'text' },
        { key: 'qty', label: 'Qty', type: 'number' },
      ]),
      checkbox('Further work required'),
      textarea('Recommendations', { condition: undefined }),
      photo('Photos'),
      sign('Technician signature', 'technician'),
      sign('Customer sign-off', 'customer')
    ),
  },
]

// ── General trade & safety templates ────────────────────────────────────────

const general: LibraryTemplate[] = [
  {
    key: 'job-sheet',
    name: 'Job Sheet / Work Order',
    category: 'general',
    description: 'Universal job sheet with times, work description and sign-off.',
    doc_prefix: 'JOB',
    schema: schema(
      heading('Job Sheet'),
      jobHeaderBlock(),
      time('Start time'),
      time('Finish time'),
      textarea('Work description', { required: true, autofill: 'job.description' }),
      table('Labour', [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'hours', label: 'Hours', type: 'number' },
      ]),
      table('Materials', [
        { key: 'item', label: 'Item', type: 'text' },
        { key: 'qty', label: 'Qty', type: 'number' },
      ]),
      photo('Photos'),
      sign('Technician', 'technician'),
      sign('Customer', 'customer')
    ),
  },
  {
    key: 'swms',
    name: 'SWMS — Safe Work Method Statement',
    category: 'safety',
    description: 'High-risk construction work method statement (WHS Regulation).',
    doc_prefix: 'SWMS',
    schema: schema(
      heading('Safe Work Method Statement'),
      jobHeaderBlock(),
      text('Principal contractor'),
      select('High-risk work type', [
        'Work on or near energised electrical installations',
        'Work at heights above 2m',
        'Work in confined spaces',
        'Work near mobile plant',
        'Other',
      ], { required: true }),
      table('Job steps, hazards & controls', [
        { key: 'step', label: 'Job step', type: 'text' },
        { key: 'hazard', label: 'Potential hazards', type: 'text' },
        { key: 'controls', label: 'Control measures', type: 'text' },
        { key: 'risk', label: 'Residual risk', type: 'text' },
      ], { minRows: 4, required: true }),
      table('PPE required', [{ key: 'item', label: 'PPE item', type: 'text' }]),
      checkbox('Workers consulted on this SWMS', { required: true }),
      table('Worker sign-on', [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'date', label: 'Date', type: 'text' },
      ], { minRows: 2 }),
      sign('Supervisor approval', 'supervisor')
    ),
  },
  {
    key: 'risk-assessment-jsa',
    name: 'Risk Assessment / JSA',
    category: 'safety',
    description: 'Task-based job safety analysis with risk matrix ratings.',
    doc_prefix: 'JSA',
    schema: schema(
      heading('Job Safety Analysis'),
      jobHeaderBlock(),
      textarea('Task description', { required: true }),
      table('Hazard analysis', [
        { key: 'step', label: 'Task step', type: 'text' },
        { key: 'hazard', label: 'Hazard', type: 'text' },
        { key: 'initial_risk', label: 'Initial risk', type: 'text' },
        { key: 'controls', label: 'Controls', type: 'text' },
        { key: 'residual_risk', label: 'Residual risk', type: 'text' },
      ], { minRows: 3, required: true }),
      checkbox('All controls in place before starting work', { required: true }),
      sign('Completed by', 'technician'),
      sign('Reviewed by', 'supervisor')
    ),
  },
  {
    key: 'incident-report',
    name: 'Incident / Near Miss Report',
    category: 'safety',
    description: 'WHS incident and near-miss reporting with corrective actions.',
    doc_prefix: 'INC',
    schema: schema(
      heading('Incident / Near Miss Report'),
      jobHeaderBlock(),
      select('Report type', ['Injury', 'Near miss', 'Property damage', 'Environmental', 'Electric shock'], { required: true }),
      date('Date of incident', { required: true }),
      time('Time of incident', { required: true }),
      textarea('What happened', { required: true }),
      textarea('Immediate action taken', { required: true }),
      text('Witnesses'),
      checkbox('Notifiable incident (regulator informed)'),
      checkbox('Electric shock — reported to network operator/regulator', { condition: undefined }),
      textarea('Corrective actions to prevent recurrence'),
      photo('Photos of scene'),
      sign('Reported by', 'technician'),
      sign('Supervisor review', 'supervisor')
    ),
  },
  {
    key: 'site-induction',
    name: 'Site Induction',
    category: 'safety',
    description: 'Site-specific induction acknowledgement for workers and visitors.',
    doc_prefix: 'IND',
    schema: schema(
      heading('Site Induction Record'),
      text('Site address', { autofill: 'job.customer_address', required: true }),
      date('Date', { autofill: 'date.today' }),
      text('Inducted by', { autofill: 'technician.name' }),
      divider(),
      checkbox('Site hazards explained'),
      checkbox('Emergency procedures & exits explained'),
      checkbox('Amenities location explained'),
      checkbox('PPE requirements explained'),
      checkbox('Incident reporting process explained'),
      table('Inducted persons', [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'company', label: 'Company', type: 'text' },
        { key: 'contact', label: 'Contact', type: 'text' },
      ], { minRows: 2, required: true }),
      sign('Inductor signature', 'technician')
    ),
  },
  {
    key: 'prestart-checklist',
    name: 'Pre-start Checklist',
    category: 'safety',
    description: 'Daily pre-start safety and site condition check.',
    doc_prefix: 'PRE',
    schema: schema(
      heading('Daily Pre-start Checklist'),
      jobHeaderBlock(),
      passfail('Work area clear and safe'),
      passfail('Required permits in place'),
      passfail('Tools & equipment inspected'),
      passfail('Test equipment calibrated'),
      passfail('PPE available and worn'),
      passfail('Circuits identified & isolation points confirmed'),
      passfail('Weather conditions acceptable'),
      textarea('Hazards noted today'),
      sign('Completed by', 'technician')
    ),
  },
  {
    key: 'vehicle-inspection',
    name: 'Vehicle Inspection',
    category: 'assets',
    description: 'Periodic work vehicle condition and safety inspection.',
    doc_prefix: 'VEH',
    schema: schema(
      heading('Vehicle Inspection'),
      text('Vehicle rego', { required: true }),
      num('Odometer (km)', { required: true }),
      date('Date', { autofill: 'date.today' }),
      text('Inspected by', { autofill: 'technician.name' }),
      divider(),
      passfail('Tyres & wheels'),
      passfail('Lights & indicators'),
      passfail('Brakes'),
      passfail('Fluid levels'),
      passfail('First aid kit stocked'),
      passfail('Fire extinguisher in date'),
      passfail('Load restraint equipment'),
      textarea('Defects noted'),
      photo('Photos'),
      sign('Inspector', 'technician')
    ),
  },
  {
    key: 'completion-handover',
    name: 'Completion Certificate & Handover',
    category: 'general',
    description: 'Practical completion, customer acceptance and warranty details.',
    doc_prefix: 'COMP',
    schema: schema(
      heading('Certificate of Completion'),
      jobHeaderBlock(),
      textarea('Scope of completed work', { required: true, autofill: 'job.description' }),
      date('Date of practical completion', { required: true, autofill: 'date.today' }),
      num('Warranty period (months)', { defaultValue: 12 }),
      checkbox('Operation demonstrated to customer'),
      checkbox('Manuals / documentation provided'),
      checkbox('Site left clean and tidy'),
      textarea('Outstanding items / exclusions'),
      photo('Completion photos'),
      sign('Contractor', 'technician'),
      sign('Customer acceptance', 'customer')
    ),
  },
  {
    key: 'variation-form',
    name: 'Variation Form',
    category: 'general',
    description: 'Contract variation with pricing and customer approval.',
    doc_prefix: 'VAR',
    schema: schema(
      heading('Contract Variation'),
      jobHeaderBlock(),
      textarea('Original scope', { autofill: 'job.description' }),
      textarea('Variation description', { required: true }),
      textarea('Reason for variation', { required: true }),
      num('Additional cost (ex GST)', { required: true, id: 'var_cost' }),
      f({ type: 'calculated', label: 'Additional cost (inc GST)', formula: 'var_cost * 1.1', id: 'var_cost_gst' }),
      num('Additional days required'),
      sign('Contractor', 'technician'),
      sign('Customer approval', 'customer')
    ),
  },
  {
    key: 'timesheet',
    name: 'Timesheet',
    category: 'hr',
    description: 'Weekly employee timesheet with job allocation.',
    doc_prefix: 'TS',
    schema: schema(
      heading('Weekly Timesheet'),
      text('Employee', { autofill: 'technician.name', required: true }),
      date('Week ending', { required: true }),
      table('Hours', [
        { key: 'day', label: 'Day', type: 'text' },
        { key: 'job', label: 'Job / site', type: 'text' },
        { key: 'start', label: 'Start', type: 'text' },
        { key: 'finish', label: 'Finish', type: 'text' },
        { key: 'break_min', label: 'Break (min)', type: 'number' },
        { key: 'hours', label: 'Total hrs', type: 'number' },
      ], { minRows: 5, required: true }),
      sign('Employee', 'technician'),
      sign('Approved by', 'supervisor')
    ),
  },
  {
    key: 'purchase-order',
    name: 'Purchase Order / Material Request',
    category: 'general',
    description: 'Materials ordering with supplier and delivery details.',
    doc_prefix: 'PO',
    schema: schema(
      heading('Purchase Order'),
      text('Supplier', { required: true }),
      text('Deliver to', { autofill: 'job.customer_address' }),
      text('Job number', { autofill: 'job.number' }),
      date('Required by'),
      table('Items', [
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'unit_price', label: 'Unit price', type: 'number' },
      ], { minRows: 3, required: true }),
      textarea('Delivery instructions'),
      sign('Authorised by', 'supervisor')
    ),
  },
  {
    key: 'asset-register',
    name: 'Asset / Equipment Inspection',
    category: 'assets',
    description: 'Asset condition record with next-service scheduling.',
    doc_prefix: 'AST',
    schema: schema(
      heading('Asset Inspection'),
      jobHeaderBlock(),
      table('Assets inspected', [
        { key: 'asset', label: 'Asset', type: 'text' },
        { key: 'serial', label: 'Serial no.', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'condition', label: 'Condition', type: 'text' },
        { key: 'result', label: 'Result', type: 'passfail' },
        { key: 'next_due', label: 'Next due', type: 'text' },
      ], { minRows: 3, required: true }),
      textarea('Notes'),
      photo('Asset photos'),
      sign('Inspector', 'technician')
    ),
  },
]

export const FORM_LIBRARY: LibraryTemplate[] = [...electrical, ...general]

export function getLibraryTemplate(key: string): LibraryTemplate | undefined {
  return FORM_LIBRARY.find((t) => t.key === key)
}

/** Copies a library template into the tenant so they can customise it. */
export async function installLibraryTemplate(
  key: string,
  tenantId: string,
  userId: string
): Promise<FormTemplate> {
  const lib = getLibraryTemplate(key)
  if (!lib) throw new Error('Template not found in library')
  return createTemplate(tenantId, userId, {
    name: lib.name,
    category: lib.category,
    description: lib.description,
    doc_prefix: lib.doc_prefix,
    schema: lib.schema,
  })
}
