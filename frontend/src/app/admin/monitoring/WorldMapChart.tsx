'use client'

import { useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps'

// World map component for country distribution
export function WorldMapChart({ data }: { data: Array<{ country: string, count: number }> }) {
  const [tooltipContent, setTooltipContent] = useState<{ country: string, count: number } | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  
  // Debug: log raw data received
  console.log('WorldMapChart received data:', data)
  
  // Create a map of ISO2 country codes to counts
  // data contains ISO2 codes (e.g., "FR", "US", "GB", "TN")
  const countryDataMap = new Map<string, number>()
  if (data && Array.isArray(data)) {
    data.forEach(item => {
      // item.country should be ISO2 code (e.g., "FR", "US", "TN")
      const iso2Code = String(item.country || '').toUpperCase().trim()
      if (iso2Code.length === 2) {
        countryDataMap.set(iso2Code, item.count || 0)
      }
    })
  }
  
  // Debug: log the data we have
  console.log('Country data map:', Array.from(countryDataMap.entries()))
  
  // Debug: log the data we have
  if (countryDataMap.size > 0) {
    console.log('Country data map:', Array.from(countryDataMap.entries()))
  }
  
  // Find max count for color scaling (only if we have data)
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1
  
  // Function to get color based on count (blue gradient for countries with users, gray for others)
  const getColor = (count: number) => {
    if (count === 0) return '#E5E7EB' // Gray for countries without users
    const intensity = count / maxCount
    // Blue gradient from light (#E3F2FD) to dark (#1565C0)
    const r = Math.floor(227 - (227 - 21) * intensity)
    const g = Math.floor(242 - (242 - 101) * intensity)
    const b = Math.floor(253 - (253 - 192) * intensity)
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Helper function to match ISO2 country codes - ROBUST VERSION
  const getCountryCount = (geo: any): number => {
    if (!geo || countryDataMap.size === 0) {
      return 0
    }
    
    // Try multiple ways to access properties
    const props = geo.properties || geo || {}
    const countryName = props.NAME || props.name || props.NAME_LONG || props.NAME_EN || props.NAME_SORT || ''
    const normalizedName = countryName.toLowerCase().trim()
    
    // Try ALL possible ISO2 property names (check both uppercase and lowercase)
    const allIso2Props = [
      'ISO_A2', 'ISO_A2_EH', 'ISO2', 'ISO_A2_', 'ISO_A2_EH_',
      'ISO_A2_EH1', 'ISO_A2_EH2', 'ISO_A2_EH3', 'ISO_A2_EH4',
      'ISO_A2_EH5', 'ISO_A2_EH6', 'ISO_A2_EH7', 'ISO_A2_EH8',
      'ISO_A2_EH9', 'ISO_A2_EH10', 'ISO_A2_EH11', 'ISO_A2_EH12',
      'iso_a2', 'iso_a2_eh', 'iso2', 'iso_a2_', 'iso_a2_eh_',
      'iso_a2_eh1', 'iso_a2_eh2', 'iso_a2_eh3', 'iso_a2_eh4',
      'iso_a2_eh5', 'iso_a2_eh6', 'iso_a2_eh7', 'iso_a2_eh8',
      'iso_a2_eh9', 'iso_a2_eh10', 'iso_a2_eh11', 'iso_a2_eh12'
    ]
    
    let iso2Code = ''
    for (const prop of allIso2Props) {
      const value = props[prop]
      if (value && typeof value === 'string') {
        const normalized = value.toUpperCase().trim()
        if (normalized.length === 2 && normalized !== '-99' && normalized !== 'NA' && normalized !== '') {
          iso2Code = normalized
          break
        }
      }
    }
    
    // Try ISO3 (both uppercase and lowercase)
    const iso3Code = (
      props.ISO_A3 || props.ISO3 || props.iso_a3 || props.iso3 || ''
    ).toUpperCase().trim()
    
    // Comprehensive ISO3 to ISO2 mapping
    const iso3ToIso2: Record<string, string> = {
      'TUN': 'TN', 'FRA': 'FR', 'USA': 'US', 'GBR': 'GB', 'DEU': 'DE', 'ESP': 'ES', 'ITA': 'IT',
      'DZA': 'DZ', 'MAR': 'MA', 'EGY': 'EG', 'LBY': 'LY', 'CAN': 'CA', 'AUS': 'AU', 'BRA': 'BR',
      'CHN': 'CN', 'IND': 'IN', 'JPN': 'JP', 'RUS': 'RU', 'ZAF': 'ZA', 'MEX': 'MX', 'IDN': 'ID',
      'TUR': 'TR', 'SAU': 'SA', 'IRN': 'IR', 'THA': 'TH', 'VNM': 'VN', 'POL': 'PL', 'UKR': 'UA',
      'ARG': 'AR', 'NLD': 'NL', 'BEL': 'BE', 'SWE': 'SE', 'CHE': 'CH', 'AUT': 'AT', 'NOR': 'NO',
      'DNK': 'DK', 'FIN': 'FI', 'PRT': 'PT', 'GRC': 'GR', 'IRL': 'IE', 'CZE': 'CZ', 'ROU': 'RO',
      'HUN': 'HU', 'BGR': 'BG', 'HRV': 'HR', 'SVK': 'SK', 'SVN': 'SI', 'LTU': 'LT', 'LVA': 'LV',
      'EST': 'EE', 'NZL': 'NZ', 'SGP': 'SG', 'MYS': 'MY', 'PHL': 'PH', 'BGD': 'BD', 'PAK': 'PK',
      'AFG': 'AF', 'IRQ': 'IQ', 'SYR': 'SY', 'YEM': 'YE', 'JOR': 'JO', 'LBN': 'LB', 'ISR': 'IL',
      'PSE': 'PS', 'KWT': 'KW', 'QAT': 'QA', 'ARE': 'AE', 'OMN': 'OM', 'BHR': 'BH', 'ETH': 'ET',
      'KEN': 'KE', 'UGA': 'UG', 'TZA': 'TZ', 'GHA': 'GH', 'CMR': 'CM', 'CIV': 'CI', 'SEN': 'SN',
      'MLI': 'ML', 'BFA': 'BF', 'NER': 'NE', 'TCD': 'TD', 'SDN': 'SD', 'SOM': 'SO', 'DJI': 'DJ',
      'ERI': 'ER', 'GIN': 'GN', 'GMB': 'GM', 'GNB': 'GW', 'SLE': 'SL', 'LBR': 'LR', 'MRT': 'MR',
      'MUS': 'MU', 'MDG': 'MG', 'MOZ': 'MZ', 'MWI': 'MW', 'ZMB': 'ZM', 'ZWE': 'ZW', 'BWA': 'BW',
      'NAM': 'NA', 'AGO': 'AO', 'COG': 'CG', 'GAB': 'GA', 'GNQ': 'GQ', 'STP': 'ST', 'CAF': 'CF',
      'RWA': 'RW', 'BDI': 'BI', 'SSD': 'SS', 'TGO': 'TG', 'BEN': 'BJ', 'NGA': 'NG', 'GEO': 'GE',
      'ARM': 'AM', 'AZE': 'AZ', 'KAZ': 'KZ', 'UZB': 'UZ', 'TKM': 'TM', 'KGZ': 'KG', 'TJK': 'TJ',
      'MNG': 'MN', 'PRK': 'KP', 'KOR': 'KR', 'TWN': 'TW', 'HKG': 'HK', 'MAC': 'MO', 'MMR': 'MM',
      'LAO': 'LA', 'KHM': 'KH', 'LKA': 'LK', 'MDV': 'MV', 'BTN': 'BT', 'NPL': 'NP', 'MDA': 'MD',
      'BLR': 'BY', 'ALB': 'AL', 'MKD': 'MK', 'BIH': 'BA', 'MNE': 'ME', 'SRB': 'RS', 'XKX': 'XK',
      'ISL': 'IS', 'LIE': 'LI', 'MCO': 'MC', 'SMR': 'SM', 'VAT': 'VA', 'AND': 'AD', 'MLT': 'MT',
      'CYP': 'CY', 'LUX': 'LU', 'JEY': 'JE', 'GGY': 'GG', 'IMN': 'IM', 'FRO': 'FO', 'GLP': 'GP',
      'MTQ': 'MQ', 'GUF': 'GF', 'REU': 'RE', 'MYT': 'YT', 'SPM': 'PM', 'BLM': 'BL', 'MAF': 'MF',
      'CUW': 'CW', 'ABW': 'AW', 'SXM': 'SX', 'BES': 'BQ', 'VGB': 'VG', 'AIA': 'AI', 'MSR': 'MS',
      'KNA': 'KN', 'ATG': 'AG', 'DMA': 'DM', 'GRD': 'GD', 'LCA': 'LC', 'VCT': 'VC', 'BRB': 'BB',
      'TTO': 'TT', 'JAM': 'JM', 'CUB': 'CU', 'HTI': 'HT', 'DOM': 'DO', 'PRI': 'PR',
      'VIR': 'VI', 'BHS': 'BS', 'BLZ': 'BZ', 'GTM': 'GT', 'SLV': 'SV', 'HND': 'HN', 'NIC': 'NI',
      'CRI': 'CR', 'PAN': 'PA', 'COL': 'CO', 'VEN': 'VE', 'GUY': 'GY', 'SUR': 'SR',
      'ECU': 'EC', 'PER': 'PE', 'BOL': 'BO', 'PRY': 'PY', 'URY': 'UY', 'CHL': 'CL', 'FLK': 'FK',
      'SGS': 'GS', 'ATA': 'AQ', 'BVT': 'BV', 'HMD': 'HM', 'ATF': 'TF', 'IOT': 'IO', 'CCK': 'CC',
      'CXR': 'CX', 'NFK': 'NF', 'PCN': 'PN', 'TKL': 'TK', 'UMI': 'UM', 'WLF': 'WF', 'PYF': 'PF',
      'NCL': 'NC', 'PNG': 'PG', 'SLB': 'SB', 'VUT': 'VU', 'FJI': 'FJ', 'TON': 'TO',
      'WSM': 'WS', 'ASM': 'AS', 'GUM': 'GU', 'MHL': 'MH', 'FSM': 'FM', 'PLW': 'PW', 'NRU': 'NR',
      'KIR': 'KI', 'TUV': 'TV', 'COK': 'CK', 'NIU': 'NU'
    }
    
    // Comprehensive country name to ISO2 mapping
    const countryNameToIso2: Record<string, string> = {
      'tunisia': 'TN', 'tunisie': 'TN', 'tunis': 'TN',
      'france': 'FR', 'united states': 'US', 'united states of america': 'US', 'usa': 'US',
      'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
      'germany': 'DE', 'allemagne': 'DE', 'deutschland': 'DE',
      'spain': 'ES', 'espagne': 'ES', 'italy': 'IT', 'italie': 'IT',
      'algeria': 'DZ', 'algerie': 'DZ', 'morocco': 'MA', 'maroc': 'MA',
      'egypt': 'EG', 'egypte': 'EG', 'libya': 'LY', 'libye': 'LY',
      'canada': 'CA', 'australia': 'AU', 'brazil': 'BR', 'bresil': 'BR',
      'china': 'CN', 'chine': 'CN', 'india': 'IN', 'inde': 'IN',
      'japan': 'JP', 'japon': 'JP', 'russia': 'RU', 'russie': 'RU',
      'south africa': 'ZA', 'afrique du sud': 'ZA'
    }
    
    // Strategy 1: Direct ISO2 match
    if (iso2Code && countryDataMap.has(iso2Code)) {
      const count = countryDataMap.get(iso2Code) || 0
      if (normalizedName.includes('tunisia')) {
        console.log(`✅ Matched Tunisia by ISO2: ${iso2Code} -> count: ${count}`)
      }
      return count
    }
    
    // Strategy 2: ISO3 to ISO2
    if (iso3Code && iso3Code.length === 3) {
      const mappedIso2 = iso3ToIso2[iso3Code]
      if (mappedIso2 && countryDataMap.has(mappedIso2)) {
        const count = countryDataMap.get(mappedIso2) || 0
        if (normalizedName.includes('tunisia')) {
          console.log(`✅ Matched Tunisia by ISO3: ${iso3Code} -> ${mappedIso2} -> count: ${count}`)
        }
        return count
      }
    }
    
    // Strategy 3: Country name match
    const mappedIso2 = countryNameToIso2[normalizedName]
    if (mappedIso2 && countryDataMap.has(mappedIso2)) {
      const count = countryDataMap.get(mappedIso2) || 0
      if (normalizedName.includes('tunisia')) {
        console.log(`✅ Matched Tunisia by name: "${countryName}" -> ${mappedIso2} -> count: ${count}`)
      }
      return count
    }
    
    // Strategy 4: Partial name match (for Tunisia specifically)
    if (normalizedName.includes('tunisia') || normalizedName.includes('tunis')) {
      if (countryDataMap.has('TN')) {
        const count = countryDataMap.get('TN') || 0
        console.log(`✅ Matched Tunisia by partial name: "${countryName}" -> TN -> count: ${count}`)
        return count
      }
    }
    
    // Debug: log Tunisia if still not matched
    if (normalizedName.includes('tunisia') || normalizedName.includes('tunis')) {
      console.error('❌ Tunisia NOT matched after all strategies!', {
        countryName,
        normalizedName,
        iso2Code,
        iso3Code,
        availableInMap: Array.from(countryDataMap.entries()),
        allProperties: Object.keys(props),
        sampleProps: {
          ISO_A2: props.ISO_A2,
          ISO_A2_EH: props.ISO_A2_EH,
          ISO_A3: props.ISO_A3,
          NAME: props.NAME,
          name: props.name,
          NAME_LONG: props.NAME_LONG,
          NAME_EN: props.NAME_EN
        }
      })
    }
    
    return 0
  }
  
  // World map URL (using a simple world map topology)
  const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  
  return (
    <div 
      className="relative"
      onMouseMove={(e) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }}
    >
      <ComposableMap
        projectionConfig={{
          scale: 147,
          center: [0, 20],
        }}
        width={800}
        height={400}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) => {
            // Debug: log FULL structure of first geography to understand the data format
            if (geographies.length > 0) {
              const firstGeo = geographies[0]
              console.log('Full geography structure:', {
                geo: firstGeo,
                properties: firstGeo.properties,
                allKeys: Object.keys(firstGeo),
                propertiesKeys: firstGeo.properties ? Object.keys(firstGeo.properties) : 'no properties',
                sampleData: geographies.find(g => {
                  const props = g.properties || {}
                  const name = props.NAME || props.name || props.NAME_LONG || props.NAME_EN || ''
                  return name.toLowerCase().includes('tunisia')
                })
              })
            }
            
            return geographies.map((geo) => {
              // Try multiple ways to access properties
              const props = geo.properties || geo || {}
              const mapCountryName = props.NAME || props.name || props.NAME_LONG || props.NAME_EN || props.NAME_SORT || ''
              const countryCode = (
                props.ISO_A2 || 
                props.ISO_A2_EH || 
                props.ISO2 || 
                props.iso_a2 ||
                props.iso_a2_eh ||
                props.ISO_A3 || 
                props.ISO3 ||
                props.iso_a3 ||
                ''
              ).toUpperCase()
              
              const count = getCountryCount(geo)
              const fillColor = getColor(count)
              
              // Debug: log Tunisia specifically
              if (mapCountryName.toLowerCase().includes('tunisia')) {
                console.log('Tunisia rendering:', {
                  countryName: mapCountryName,
                  count,
                  fillColor,
                  countryCode,
                  allProps: Object.keys(props)
                })
              }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      fill: fillColor,
                      outline: 'none',
                    },
                    hover: {
                      fill: count > 0 ? '#1976D2' : '#9CA3AF',
                      outline: 'none',
                      cursor: 'pointer',
                    },
                    pressed: {
                      fill: count > 0 ? '#0D47A1' : '#6B7280',
                      outline: 'none',
                    },
                  }}
                  onMouseEnter={() => {
                    setTooltipContent({
                      country: countryCode || mapCountryName,
                      count: count,
                    })
                  }}
                  onMouseLeave={() => {
                    setTooltipContent(null)
                  }}
                />
              )
            })
          }}
        </Geographies>
      </ComposableMap>
      
      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded shadow-lg pointer-events-none z-50"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-semibold">{tooltipContent.country}</div>
          <div className="text-sm">{tooltipContent.count} utilisateur{tooltipContent.count > 1 ? 's' : ''}</div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 bg-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">Aucun utilisateur</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-gray-600">Moins</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => {
              const r = Math.floor(227 - (227 - 21) * intensity)
              const g = Math.floor(242 - (242 - 101) * intensity)
              const b = Math.floor(253 - (253 - 192) * intensity)
              return (
                <div
                  key={intensity}
                  className="w-8 h-4"
                  style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                />
              )
            })}
          </div>
          <span className="text-sm text-gray-600">Plus</span>
        </div>
      </div>
    </div>
  )
}

