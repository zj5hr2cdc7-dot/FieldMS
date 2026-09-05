'use client'

export interface As3000Clause {
  id: string
  title: string
  keywords: string[]
  summary: string
  reference: string
}

export interface ElectricalStandardReference {
  id: string
  title: string
  reference: string
  summary: string
  keywords: string[]
  source: string
}

export interface FaultfinderDiagram {
  id: string
  title: string
  keywords: string[]
  summary: string
  source: string
}

const AS3000_CLAUSES: As3000Clause[] = [
  {
    id: '2.5.3',
    title: 'Wet area powerpoints',
    keywords: ['wet area', 'powerpoint', 'power point', 'bathroom', 'laundry', 'shower', 'splash'],
    summary:
      'Powerpoints installed in wet areas must be protected from moisture intrusion and must meet the specific requirements for location, IP rating, and safety switch protection.',
    reference: 'AS/NZS 3000 Clause 2.5.3',
  },
  {
    id: '2.5.4',
    title: 'Safety switch protection in wet areas',
    keywords: ['rcd', 'safety switch', 'wet area protection', 'residual current device', 'rccb'],
    summary:
      'Circuits serving wet areas require safety switch protection to reduce the risk of electric shock in locations where water is present.',
    reference: 'AS/NZS 3000 Clause 2.5.4',
  },
  {
    id: '3.4.5',
    title: 'Circuit protection device selection',
    keywords: ['circuit breaker', 'protection device', 'overcurrent', 'fuse', 'tripping'],
    summary:
      'The correct rating and type of circuit protection devices must be selected to protect cables and equipment from overload and fault currents.',
    reference: 'AS/NZS 3000 Clause 3.4.5',
  },
  {
    id: '3.9.2',
    title: 'Earthing and bonding',
    keywords: ['earthing', 'bonding', 'earth', 'equipotential', 'ground'],
    summary:
      'Proper earthing and bonding are required for safe operation and to ensure the fault loop impedance remains within acceptable limits.',
    reference: 'AS/NZS 3000 Clause 3.9.2',
  },
  {
    id: '4.2.2',
    title: 'Cable selection in concealed spaces',
    keywords: ['cable selection', 'concealed', 'wall cavity', 'roof space', 'tray', 'duct'],
    summary:
      'Cables installed in concealed spaces must be selected and supported to prevent damage from heat, moisture, or mechanical stress.',
    reference: 'AS/NZS 3000 Clause 4.2.2',
  },
  {
    id: '7.2.1',
    title: 'Fault loop impedance testing',
    keywords: ['fault loop', 'impedance', 'z<sub>s', 'earth fault', 'z s', 'loop test'],
    summary:
      'Fault loop impedance must be verified to confirm that protective devices will clear earth faults within the required time.',
    reference: 'AS/NZS 3000 Clause 7.2.1',
  },
  {
    id: '7.4.3',
    title: 'Inspection and testing before energising',
    keywords: ['inspection', 'testing', 'energise', 'pre-energisation', 'visual check'],
    summary:
      'A full inspection and test must be completed before the circuit is energised, including continuity, insulation resistance and polarity checks.',
    reference: 'AS/NZS 3000 Clause 7.4.3',
  },
  {
    id: '2.5.10',
    title: 'Powerpoint and fixed appliance heights in wet areas',
    keywords: ['powerpoint height', 'power point height', 'socket height', 'outlet height', 'outlet location', 'wet area height', 'wet area outlet'],
    summary:
      'Outlets and fixed appliances in wet areas must be installed at approved heights and distances from water sources to maintain safety and comply with installation rules.',
    reference: 'AS/NZS 3000 Clause 2.5.10',
  },
  {
    id: '2.7.1',
    title: 'Swimming pool equipment and safety',
    keywords: ['pool heater', 'pool equipment', 'swimming pool', 'spa', 'pool safety', 'pool pump'],
    summary:
      'Electrical equipment for swimming pools and spas must comply with distance, bonding, and isolation requirements to prevent electric shock.',
    reference: 'AS/NZS 3000 Clause 2.7.1',
  },
]

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

export function searchAS3000Clauses(query: string): As3000Clause[] {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return AS3000_CLAUSES
  }

  const matched = AS3000_CLAUSES.filter((clause) => {
    return (
      clause.id.toLowerCase().includes(normalizedQuery) ||
      clause.title.toLowerCase().includes(normalizedQuery) ||
      clause.summary.toLowerCase().includes(normalizedQuery) ||
      clause.keywords.some((keyword) => keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword))
    )
  })

  return matched.length ? matched : AS3000_CLAUSES.filter((clause) => clause.summary.toLowerCase().includes(normalizedQuery))
}

export function getAS3000ClauseForJob(title: string, description = ''): As3000Clause | null {
  const source = normalizeText(`${title} ${description}`)

  const matchingClause = AS3000_CLAUSES.find((clause) =>
    clause.keywords.some((keyword) => source.includes(keyword)) ||
    source.includes(clause.title.toLowerCase())
  )

  return matchingClause || null
}

export function formatClauseReferenceText(clause: As3000Clause) {
  return `${clause.reference} — ${clause.title}`
}

const ELECTRICAL_STANDARDS: ElectricalStandardReference[] = [
  {
    id: 'as3000',
    title: 'AS/NZS 3000: Wiring Rules',
    reference: 'AS/NZS 3000',
    summary: 'The essential standard for electrical installations, covering wiring, protection, earthing, and equipment selection.',
    keywords: ['wiring rules', 'installation', 'protection', 'earthing', 'socket', 'switch', 'fault loop', 'pool', 'heater', 'pool heater', 'wet area'],
    source: 'Standards Australia',
  },
  {
    id: 'as3017',
    title: 'AS/NZS 3017: Electrical installations - Verification guidelines',
    reference: 'AS/NZS 3017',
    summary: 'Guidelines for inspection and testing of electrical installations, including verification procedures before energising.',
    keywords: ['testing', 'verification', 'inspection', 'energise', 'polarity', 'continuity'],
    source: 'Standards Australia',
  },
  {
    id: 'as3019',
    title: 'AS/NZS 3019: Electrical installations - Periodic verification',
    reference: 'AS/NZS 3019',
    summary: 'Requirements for periodic inspection and testing of existing electrical installations to ensure ongoing safety.',
    keywords: ['periodic verification', 'inspection', 'maintenance', 'testing', 'existing installations'],
    source: 'Standards Australia',
  },
  {
    id: 'as3760',
    title: 'AS/NZS 3760: In-service safety inspection and testing of electrical equipment',
    reference: 'AS/NZS 3760',
    summary: 'Procedures for regular safety testing of portable electrical equipment and appliances in service.',
    keywords: ['portable equipment', 'appliance testing', 'in-service testing', 'tagging', 'inspection'],
    source: 'Standards Australia',
  },
  {
    id: 'as3008',
    title: 'AS/NZS 3008: Selection of cables',
    reference: 'AS/NZS 3008',
    summary: 'Guidance on selecting and installing cables for electrical installations, including sizing, derating, and thermal considerations.',
    keywords: ['cable selection', 'cable sizing', 'derating', 'thermal constraints', 'conductor'],
    source: 'Standards Australia',
  },
  {
    id: 'as4836',
    title: 'AS/NZS 4836: Safe working on or near low-voltage electrical installations',
    reference: 'AS/NZS 4836',
    summary: 'Safety practices for electricians working on or near live low-voltage electrical installations.',
    keywords: ['safe work', 'live work', 'isolation', 'PPE', 'low voltage'],
    source: 'Standards Australia',
  },
  {
    id: 'as4576',
    title: 'AS/NZS 4576: Guidelines for electrical installation and equipment in areas of particular fire risk',
    reference: 'AS/NZS 4576',
    summary: 'Guidance for installations in locations with increased fire risk and safe handling of electrical equipment.',
    keywords: ['fire risk', 'installation guidelines', 'hazard', 'safety'],
    source: 'Standards Australia',
  },
]

export function searchElectricalStandards(query: string): ElectricalStandardReference[] {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return ELECTRICAL_STANDARDS
  }

  return ELECTRICAL_STANDARDS.filter((standard) =>
    standard.title.toLowerCase().includes(normalizedQuery) ||
    standard.summary.toLowerCase().includes(normalizedQuery) ||
    standard.keywords.some((keyword) => keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword))
  )
}

const FAULTFINDERS_DIAGRAMS: FaultfinderDiagram[] = [
  {
    id: 'ffb-01',
    title: 'Wet area trip-circuit causes',
    keywords: ['wet area', 'shower', 'bathroom', 'laundry', 'powerpoint', 'gpo', 'trip'],
    summary: 'Diagrams showing common causes of circuit trips in wet areas, including moisture ingress, incorrect RCD protection, and accessory selection.',
    source: 'Circuit-tripping diagnostics',
  },
  {
    id: 'ffb-02',
    title: 'RCD and fault loop trip sequence',
    keywords: ['rcd', 'safety switch', 'fault loop', 'impedance', 'trip'],
    summary: 'A diagnostic sequence for RCD operation and earth fault loop testing to find where a tripping fault originates.',
    source: 'Circuit-tripping diagnostics',
  },
  {
    id: 'ffb-03',
    title: 'Powerpoint circuit trip diagnosis',
    keywords: ['powerpoint', 'socket', 'no power', 'loose connection', 'fault', 'trip'],
    summary: 'A diagram for checking powerpoints and final subcircuits when the circuit trips or outlets lose power.',
    source: 'Circuit-tripping diagnostics',
  },
  {
    id: 'ffb-04',
    title: 'Protection device coordination for trips',
    keywords: ['circuit breaker', 'fuse', 'overcurrent', 'protection device', 'selective', 'trip'],
    summary: 'A guide to diagnosing trips caused by protective device selection and coordination issues on electrical circuits.',
    source: 'Circuit-tripping diagnostics',
  },
  {
    id: 'ffb-05',
    title: 'Earthing and bonding trip causes',
    keywords: ['earthing', 'bonding', 'earth', 'ground', 'equipotential', 'trip'],
    summary: 'A diagnostic layout for earth bonding and earthing checks when a circuit trips or protective devices operate unexpectedly.',
    source: 'Circuit-tripping diagnostics',
  },
]

export function searchFaultfinderDiagrams(query: string): FaultfinderDiagram[] {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return FAULTFINDERS_DIAGRAMS
  }

  const matched = FAULTFINDERS_DIAGRAMS.filter((diagram) => {
    return (
      diagram.title.toLowerCase().includes(normalizedQuery) ||
      diagram.summary.toLowerCase().includes(normalizedQuery) ||
      diagram.keywords.some((keyword) => keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword))
    )
  })

  return matched.length ? matched : FAULTFINDERS_DIAGRAMS
}

export function getDiagramReferencesForJob(title: string, description = ''): FaultfinderDiagram[] {
  const source = normalizeText(`${title} ${description}`)
  return FAULTFINDERS_DIAGRAMS.filter((diagram) =>
    diagram.keywords.some((keyword) => source.includes(keyword)) ||
    source.includes(diagram.title.toLowerCase())
  )
}

const FAULT_FINDING_RESPONSES = [
  {
    keywords: ['no power', 'power outage', 'dead socket', 'no voltage'],
    answer:
      'Start by checking the main switchboard, circuit breakers and safety switches. Verify the incoming supply, test the final subcircuit, and isolate the affected circuit before progressing.',
    checks: [
      'Check the main switchboard and meter box for tripped devices.',
      'Verify the RCD or circuit breaker status on the affected circuit.',
      'Inspect the final subcircuit wiring and outlets for damage or loose connections.',
    ],
  },
  {
    keywords: ['trips', 'tripping', 'rcd', 'safety switch'],
    answer:
      'If the circuit trips often, inspect the connected outlets and equipment for earth faults, damaged insulation or moisture. Test the RCD and load side wiring to identify the fault location.',
    checks: [
      'Confirm whether the trip is instant or delayed to distinguish earth faults from overloads.',
      'Inspect connected appliances and sockets for damaged insulation or moisture ingress.',
      'Test the RCD and perform a fault loop impedance check on the affected circuit.',
    ],
  },
  {
    keywords: ['wet area', 'wet area', 'bathroom', 'laundry', 'shower'],
    answer:
      'Wet areas need RCD protection and water-resistant fittings. Confirm the location meets AS/NZS 3000 wet area requirements and check the installation for correct IP-rated accessories.',
    checks: [
      'Verify RCD protection is installed for all circuits serving the wet area.',
      'Check that sockets and accessories are correctly rated for the environment.',
      'Look for moisture or water ingress around fittings and junctions.',
    ],
  },
  {
    keywords: ['earth fault', 'fault loop', 'impedance', 'loop test'],
    answer:
      'Measure the fault loop impedance and confirm it meets the required limits. Ensure the protective device clears within the correct time and that the earthing system is sound.',
    checks: [
      'Perform a fault loop impedance test on the affected circuit.',
      'Confirm that earthing and bonding connections are secure and continuous.',
      'Check that the protective device clears within the specified time.',
    ],
  },
  {
    keywords: ['flickering', 'lights', 'intermittent', 'socket'],
    answer:
      'Intermittent operation often points to loose connections, poor termination or load-related faults. Inspect the affected circuit and consider replacing damaged sockets or switches.',
    checks: [
      'Examine terminal connections for looseness or corrosion.',
      'Check the affected outlets, switches and junctions for visible damage.',
      'Test the circuit under load to isolate the intermittent condition.',
    ],
  },
]

export function answerFaultFindingQuestion(query: string) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return {
      answer: 'Type a question about electrical fault finding or electrical standards requirements to get a quick guidance note.',
      clauseMatches: [],
    }
  }

  const bestMatch = FAULT_FINDING_RESPONSES.find((item) =>
    item.keywords.some((keyword) => normalizedQuery.includes(keyword))
  )

  const answer =
    bestMatch?.answer ||
    'Review the affected circuit, check protective devices and verify earthing. If the fault is not obvious, use the electrical standards search to match the work type to the correct standard requirement.'

  const checkedPoints = bestMatch?.checks ?? []
  const clauseMatches = searchAS3000Clauses(query).slice(0, 4)
  const diagramMatches = searchFaultfinderDiagrams(query).slice(0, 4)
  const standardMatches = searchElectricalStandards(query).slice(0, 4)

  return {
    answer,
    checks: checkedPoints,
    clauseMatches,
    diagramMatches,
    standardMatches,
  }
}
