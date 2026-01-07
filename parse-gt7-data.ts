import fs from 'fs'
import path from 'path'

// Parse CSV helper
function parseCSV(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index]
    })
    return obj
  })
}

// Parse cars
function parseCars() {
  const cars = parseCSV('./gt7data/cars.csv')
  const makers = parseCSV('./gt7data/maker.csv')
  const countries = parseCSV('./gt7data/country.csv')

  // Create lookup maps
  const makerMap = new Map(makers.map(m => [m.ID, m.Name]))
  const countryMap = new Map(countries.map(c => [c.ID, c.Name]))

  // Extract year from car name (e.g., "'96" or "'2015")
  function extractYear(name: string): number | null {
    const match = name.match(/'(\d{2,4})/)
    if (!match) return null
    const year = match[1]
    // If 2 digits, assume 19xx if >= 50, else 20xx
    if (year.length === 2) {
      const num = parseInt(year)
      return num >= 50 ? 1900 + num : 2000 + num
    }
    return parseInt(year)
  }

  // Determine category based on car name
  function determineCategory(name: string): string {
    if (name.includes('Gr.1') || name.includes('Gr1')) return 'GR1'
    if (name.includes('Gr.2') || name.includes('Gr2')) return 'GR2'
    if (name.includes('Gr.3') || name.includes('Gr3')) return 'GR3'
    if (name.includes('Gr.4') || name.includes('Gr4')) return 'GR4'
    if (name.includes('Gr.B') || name.includes('GrB') || name.includes('Rally')) return 'RALLY'
    if (name.includes('Vision GT')) return 'VISION_GT'
    if (name.includes('Kart')) return 'KART'
    // Default to N-class (will need refinement)
    return 'OTHER'
  }

  // Determine drive type (basic heuristic)
  function determineDriveType(name: string, manufacturer: string): string {
    // This is a simplified heuristic - you may want to refine
    const nameLower = name.toLowerCase()
    if (nameLower.includes('4wd') || nameLower.includes('quattro') || manufacturer === 'Subaru' || nameLower.includes('gt-r')) return 'AWD'
    if (nameLower.includes('mr2') || nameLower.includes('nsx') || manufacturer === 'Ferrari' || manufacturer === 'Lamborghini') return 'MR'
    if (manufacturer === 'Porsche' && nameLower.includes('911')) return 'RR'
    if (nameLower.includes('civic') || nameLower.includes('golf') || nameLower.includes('integra')) return 'FF'
    return 'FR' // Default
  }

  return cars.map(car => {
    const manufacturer = makerMap.get(car.Maker) || 'Unknown'
    return {
      id: car.ID,
      name: car.ShortName,
      manufacturer,
      year: extractYear(car.ShortName),
      category: determineCategory(car.ShortName),
      driveType: determineDriveType(car.ShortName, manufacturer)
    }
  })
}

// Parse tracks
function parseTracks() {
  const courses = parseCSV('./gt7data/course.csv')
  const bases = parseCSV('./gt7data/crsbase.csv')
  const countries = parseCSV('./gt7data/country.csv')

  // Create lookup maps
  const baseMap = new Map(bases.map(b => [b.ID, b.Name]))
  const countryMap = new Map(countries.map(c => [c.ID, c.Name]))

  // Group courses by base track
  const trackMap = new Map<string, any[]>()

  courses.forEach(course => {
    const baseName = baseMap.get(course.Base) || 'Unknown'
    if (!trackMap.has(baseName)) {
      trackMap.set(baseName, [])
    }
    trackMap.get(baseName)!.push(course)
  })

  // Convert to track objects with layouts
  return Array.from(trackMap.entries()).map(([baseName, layouts]) => {
    const firstLayout = layouts[0]
    const country = countryMap.get(firstLayout.Country) || 'Unknown'
    const category = firstLayout.Category === 'circuit' ? 'CIRCUIT' :
                     firstLayout.Category === 'city' ? 'CITY_COURSE' :
                     firstLayout.Category === 'dirt' ? 'DIRT' :
                     firstLayout.Category === 'oval' ? 'OVAL' : 'CIRCUIT'

    return {
      name: baseName,
      location: `${country}`,
      country: country,
      category: category,
      layouts: layouts.map(l => l.Name)
    }
  })
}

// Generate JSON files
const carsData = parseCars()
const tracksData = parseTracks()

fs.writeFileSync(
  path.join(__dirname, 'seed-data', 'cars.json'),
  JSON.stringify(carsData, null, 2)
)

fs.writeFileSync(
  path.join(__dirname, 'seed-data', 'tracks.json'),
  JSON.stringify(tracksData, null, 2)
)

console.log(`✓ Parsed ${carsData.length} cars`)
console.log(`✓ Parsed ${tracksData.length} tracks`)
console.log('✓ Generated seed-data/cars.json')
console.log('✓ Generated seed-data/tracks.json')
