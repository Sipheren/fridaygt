# Thumbnail Acquisition Plan for Cars and Tracks

**Date:** 2026-01-26
**Status:** Planning Phase
**Purpose:** Comprehensive plan for acquiring and storing thumbnails for all cars and tracks in the FridayGT database

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Image Source Research](#image-source-research)
3. [Legal Considerations](#legal-considerations)
4. [Technical Approaches](#technical-approaches)
5. [Recommended Implementation Plan](#recommended-implementation-plan)
6. [Schema Updates Required](#schema-updates-required)
7. [Example Implementation Code](#example-implementation-code)
8. [Testing Strategy](#testing-strategy)
9. [Maintenance and Updates](#maintenance-and-updates)

---

## Current State Assessment

### Database Schema

**Car Table** (`init.sql:85-104`)
- Already has `imageUrl` column (TEXT, nullable)
- Currently stores ~400+ cars from GT7
- Includes: manufacturer, model, year, category, PP

**Track Table** (`init.sql:67-82`)
- Already has `imageUrl` column (TEXT, nullable)
- Currently stores ~200+ track layouts from GT7
- Includes: name, location, length, category, isReverse

### Current Usage

**Frontend Display** (`src/app/races/[id]/page.tsx:459-463`)
```tsx
{car.imageUrl && (
  <img
    src={car.imageUrl}
    alt={car.name}
    className="w-16 h-12 object-cover rounded"
  />
)}
```

**API Response** (`src/app/api/races/[id]/route.ts:83`)
- Currently includes `imageUrl` in SELECT queries
- Returns null for most records (not populated)

### Data Files

- **Cars CSV:** `gt7data/gt7_cars_combined.csv` (~400 cars)
- **Tracks CSV:** `gt7data/gt7_courses_combined.csv` (~200 layouts)
- **Import Scripts:** Already exist for bulk data import

---

## Image Source Research

### Official Sources

#### 1. Gran Turismo Official Website
- **Car List:** [gran-turismo.com/gb/gt7/carlist](https://www.gran-turismo.com/gb/gt7/carlist/)
- **Track List:** [gran-turismo.com/gb/gt7/tracklist](https://www.gran-turismo.com/gb/gt7/tracklist/)
- **Pros:**
  - Official high-quality images
  - Consistent image format and sizing
  - Authoritative source
- **Cons:**
  - No public API documented
  - Requires web scraping (ToS implications)
  - Images may be protected by copyright

#### 2. Jaguar Media Pack (for GT7)
- **URL:** [media.jaguar.com - Gran Turismo 7 Images](https://media.jaguar.com/en-gb/image-packs/game-images-gran-turismo-7)
- **Pros:**
  - Downloadable high-res and low-res options
  - Official promotional images
- **Cons:**
  - Limited selection (Jaguar cars only)
  - Not comprehensive enough for all cars

### Community Sources

#### 3. KudosPrime
- **URL:** [kudosprime.com/gt7/carlist.php](https://www.kudosprime.com/gt7/carlist.php)
- **Description:** Fan-maintained GT7 database with car images
- **Pros:**
  - Comprehensive car listings
  - Has car images for most/all cars
  - May have track images
  - Community resource (more permissive)
- **Cons:**
  - No documented API
  - Image quality may vary
  - Copyright still belongs to Sony/Polyphony
- **Notes:**
  - Data sourced from Kaggle dataset
  - May have predictable URL patterns

#### 4. Gran Turismo Wiki (Fandom)
- **URL:** [gran-turismo.fandom.com](https://gran-turismo.fandom.com/wiki/Gran_Turismo_7/Track_List)
- **Pros:**
  - CC-BY-SA license (for wiki content)
  - Has gallery pages for individual tracks and cars
  - Example: [Mid-Field Raceway/Gallery](https://gran-turismo.fandom.com/wiki/Mid-Field_Raceway/Gallery)
- **Cons:**
  - Images are screenshots (not official assets)
  - Variable quality
  - Must verify individual image licenses
- **Usage:** Right-click save from individual wiki pages

#### 5. GTPlanet Forums
- **URL:** [gtplanet.net](https://www.gtplanet.net)
- **Threads:** Image compilation threads, photo sharing
- **Pros:**
  - Community-generated content
  - High-quality screenshots from players
- **Cons:**
  - No structured API
  - Manual download required
  - Copyright belongs to individual uploaders

### Third-Party Databases

#### 6. GT7Info (GitHub Pages)
- **URL:** [ddm999.github.io/gt7info](https://ddm999.github.io/gt7info/)
- **Description:** Community GT7 reference
- **Pros:**
  - May have images or image URLs
  - Open source project
- **Cons:**
  - Limited documentation
  - Unknown image coverage

---

## Legal Considerations

### Copyright Status

**Gran Turismo 7 Assets:**
- Game images (cars, tracks, logos) are copyrighted by Sony/Polyphony Digital
- **Commercial use** requires explicit permission
- **Non-commercial use** may fall under fair use, but is context-dependent

### Web Scraping Legality (2025)

**General Status:**
- Web scraping itself is legal in most jurisdictions
- BUT: Scraping copyrighted images without permission can constitute copyright infringement
- Terms of Service violations can lead to legal issues

**Key Factors:**
1. **How** you gather the data (respect robots.txt, rate limits)
2. **What** type of data (images are copyrighted material)
3. **Jurisdiction** (US, EU have different frameworks)
4. **Usage** (commercial vs. non-commercial, transformative vs. direct copy)

### Recommendations

✅ **Likely Acceptable:**
- Linking to external images (hotlinking) with attribution
- Using images for non-commercial, educational purposes with attribution
- Storing image URLs (not the images themselves)
- Community-sourced screenshots with permission

❌ **Risky:**
- Downloading and storing official assets without permission
- Using images in commercial applications without license
- Mass scraping without respecting rate limits
- Removing watermarks/attribution

⚠️ **Gray Area:**
- Caching images locally for performance
- Using images from fan wikis (CC-BY-SA may not apply to screenshots)
- Automated scraping of official sites

**Safest Approach:**
1. Store image **URLs** (not files) in database
2. Use community sources with permission/attribution
3. Add fallback/placeholder images when URLs fail
4. Consider reaching out to Sony/Polyphony for official partnership

---

## Technical Approaches

### Approach 1: URL-Only Storage (Recommended)

**Strategy:** Store image URLs in database, display via `<img>` tags

**Pros:**
- No copyright issues (not hosting files)
- No storage costs
- Always shows latest images
- Simple implementation

**Cons:**
- Dependency on external sites (link rot)
- No control over image sizing/optimization
- Hotlinking may be blocked
- Slower page loads

**Implementation:**
```typescript
// Database stores: "imageUrl": "https://kudosprime.com/gt7/images/car_123.jpg"

// Frontend:
<img src={car.imageUrl || '/placeholder-car.png'} alt={car.name} onError={handleImageError} />
```

---

### Approach 2: Download and Host

**Strategy:** Download images, store in cloud storage (Supabase Storage, S3, Cloudflare R2)

**Pros:**
- Full control over images
- Faster loading (CDN)
- No broken links
- Can optimize/resize

**Cons:**
- **Legal concerns** (hosting copyrighted material)
- Storage costs
- Maintenance burden
- Need to handle updates

**Implementation:**
```typescript
// 1. Download script
async function downloadAndUploadImages() {
  const cars = await getCars()
  for (const car of cars) {
    const response = await fetch(car.sourceUrl)
    const blob = await response.blob()
    const { data } = await supabase.storage.from('car-images').upload(`${car.id}.jpg`, blob)
    // Update database with storage URL
  }
}

// 2. Frontend
<img src={`${supabaseUrl}/storage/v1/object/public/car-images/${car.id}.jpg`} />
```

---

### Approach 3: Hybrid (Caching with Fallback)

**Strategy:** Try external URL first, cache successful loads, fallback to placeholder

**Pros:**
- Best of both worlds
- Graceful degradation
- Performance benefits

**Cons:**
- More complex implementation
- Need cache invalidation strategy
- Still hosts some images

---

### Approach 4: Community Uploads

**Strategy:** Allow users to upload images for cars/tracks they use

**Pros:**
- Community engagement
- Distributed legal responsibility
- Always has relevant images

**Cons:**
- Moderation required
- Variable quality
- Incomplete coverage
- User experience friction

---

## Recommended Implementation Plan

### Phase 1: Research and Manual Collection (Week 1)

**Goal:** Identify reliable image sources and collect sample URLs

**Tasks:**
1. ✅ Research completed (this document)
2. Manually browse KudosPrime to verify car image availability
3. Manually browse GT Wiki for track images
4. Test hotlinking from identified sources
5. Check for rate limiting/blocking

**Deliverables:**
- Spreadsheet mapping Car ID → Image URL
- Spreadsheet mapping Track ID → Image URL
- Document any URL patterns discovered

---

### Phase 2: URL Mapping Script (Week 1-2)

**Goal:** Create automated script to map database records to image URLs

**Approach A: KudosPrime URL Pattern**

```typescript
// scripts/map-car-images.ts

/**
 * Map Cars to KudosPrime Image URLs
 *
 * KudosPrime appears to have predictable URL patterns:
 * - Base: https://www.kudosprime.com/gt7/car/
 * - Pattern: /gt7/car/{slug}/image.jpg
 *
 * Strategy:
 * 1. Export all cars from database
 * 2. Generate KudosPrime URLs based on car name/slug
 * 3. Test URLs (HTTP HEAD requests)
 * 4. Update database with valid URLs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

interface CarMapping {
  id: string
  name: string
  slug: string
  manufacturer: string
  kudosPrimeUrl?: string
  status: 'found' | 'not_found' | 'error'
}

async function generateKudosPrimeUrl(car: any): Promise<string> {
  // KudosPrime URL pattern (to be verified manually)
  const normalizedSlug = car.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
  return `https://www.kudosprime.com/gt7/car/${normalizedSlug}/`
}

async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok && response.headers.get('content-type')?.startsWith('image/')
  } catch {
    return false
  }
}

async function mapCarImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all cars without imageUrl
  const { data: cars } = await supabase
    .from('Car')
    .select('id, name, slug, manufacturer, imageUrl')
    .is('imageUrl', null)

  if (!cars) {
    console.log('No cars found or all have images')
    return
  }

  console.log(`Processing ${cars.length} cars...`)

  const results: CarMapping[] = []

  for (const car of cars) {
    const url = await generateKudosPrimeUrl(car)
    const found = await testImageUrl(url)

    const mapping: CarMapping = {
      id: car.id,
      name: car.name,
      slug: car.slug,
      manufacturer: car.manufacturer,
      kudosPrimeUrl: url,
      status: found ? 'found' : 'not_found'
    }

    results.push(mapping)

    if (found) {
      await supabase
        .from('Car')
        .update({ imageUrl: url })
        .eq('id', car.id)
      console.log(`✓ ${car.name}: ${url}`)
    } else {
      console.log(`✗ ${car.name}: Not found`)
    }

    // Rate limiting: be respectful
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Save results for review
  fs.writeFileSync(
    'car-image-mapping.json',
    JSON.stringify(results, null, 2)
  )

  console.log(`\nDone! Found ${results.filter(r => r.status === 'found').length} / ${results.length}`)
}

mapCarImages().catch(console.error)
```

---

**Approach B: Manual CSV Mapping**

**Create:** `gt7data/car_image_urls.csv`
```csv
car_id,image_url,source,attribution
123,https://kudosprime.com/gt7/images/...jpg,KudosPrime,"© KudosPrime"
456,https://gran-turismo.com/gt7/car/...,Official,"© Sony/Polyphony"
```

**Import Script:**
```typescript
// scripts/import-car-image-urls.ts

/**
 * Import Car Image URLs from CSV
 *
 * Reads car_image_urls.csv and updates Car table
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function importCarImageUrls() {
  const supabase = createClient(/* ... */)

  const csvPath = path.join(process.cwd(), 'gt7data', 'car_image_urls.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').slice(1) // Skip header

  for (const line of lines) {
    const [carId, imageUrl, source, attribution] = line.split(',')

    const { error } = await supabase
      .from('Car')
      .update({ imageUrl })
      .eq('id', carId)

    if (error) {
      console.error(`Error updating car ${carId}:`, error)
    } else {
      console.log(`✓ Updated ${carId}`)
    }
  }
}

importCarImageUrls()
```

---

### Phase 3: Track Image Mapping (Week 2)

**Similar approach to cars:**

1. **Source:** GT Wiki Fandom (track gallery pages)
2. **Manual mapping:** Create CSV of track IDs to wiki page URLs
3. **Script:** Extract image URLs from gallery pages
4. **Fallback:** Use official Gran Turismo website track images

**Example:**
```typescript
// scripts/map-track-images.ts

/**
 * Map Tracks to GT Wiki Gallery Images
 *
 * Strategy:
 * 1. Manual mapping: Track ID → Wiki Gallery URL
 * 2. Parse gallery page for image URLs
 * 3. Extract first/highlighted image
 * 4. Update database
 */

async function getTrackImageFromWiki(trackName: string): Promise<string | null> {
  const wikiUrl = `https://gran-turismo.fandom.com/wiki/${encodeURIComponent(trackName)}/Gallery`

  try {
    const response = await fetch(wikiUrl)
    const html = await response.text()

    // Parse HTML for gallery images (simplified)
    const imageMatch = html.match(/<img[^>]+src="([^"]+)"/)
    return imageMatch ? imageMatch[1] : null
  } catch {
    return null
  }
}
```

---

### Phase 4: Frontend Integration (Week 2-3)

**Update components to display images with fallbacks:**

```typescript
// src/components/CarCard.tsx

interface CarCardProps {
  car: {
    id: string
    name: string
    manufacturer: string
    imageUrl?: string | null
  }
}

export function CarCard({ car }: CarCardProps) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <Card>
      <CardContent>
        {car.imageUrl && !imageError ? (
          <img
            src={car.imageUrl}
            alt={car.name}
            onError={handleImageError}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
            <Car className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <h3>{car.name}</h3>
        <p>{car.manufacturer}</p>
      </CardContent>
    </Card>
  )
}
```

---

### Phase 5: Testing and Validation (Week 3)

**Tasks:**
1. Test image loading on all pages that display cars/tracks
2. Test error handling (broken URLs)
3. Test performance (page load times)
4. Verify mobile responsiveness
5. Check for hotlink protection issues

---

## Schema Updates Required

### Current Schema (Already Compatible)

**Car Table:**
```sql
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,  -- ✅ Already exists
    ...
);
```

**Track Table:**
```sql
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,  -- ✅ Already exists
    ...
);
```

### Optional Enhancements

**Add Image Metadata (Migration Script):**

```sql
-- supabase/migrations/XXXX_add_image_metadata.sql

-- Add image source tracking
ALTER TABLE "Car" ADD COLUMN "imageSource" TEXT;
ALTER TABLE "Car" ADD COLUMN "imageAttribution" TEXT;

ALTER TABLE "Track" ADD COLUMN "imageSource" TEXT;
ALTER TABLE "Track" ADD COLUMN "imageAttribution" TEXT;

-- Add indexes for image management
CREATE INDEX "Car_imageUrl_idx" ON "Car"("imageUrl") WHERE "imageUrl" IS NOT NULL;
CREATE INDEX "Track_imageUrl_idx" ON "Track"("imageUrl") WHERE "imageUrl" IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN "Car"."imageUrl" IS 'URL to car thumbnail image (external, not hosted)';
COMMENT ON COLUMN "Car"."imageSource" IS 'Source of car image (e.g., KudosPrime, GT Wiki, Official)';
COMMENT ON COLUMN "Car"."imageAttribution" IS 'Attribution text for image copyright';
```

---

## Example Implementation Code

### Complete Script: URL-Based Approach

```typescript
// scripts/populate-image-urls.ts

/**
 * Populate Car and Track Image URLs
 *
 * This script reads mapping CSVs and updates the database with image URLs.
 * Approach: URL-only storage (no downloading)
 *
 * Usage:
 *   npx tsx scripts/populate-image-urls.ts
 *
 * Prerequisites:
 *   - gt7data/car_image_urls.csv exists
 *   - gt7data/track_image_urls.csv exists
 *   - Environment variables set
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ImageMapping {
  id: string
  imageUrl: string
  source: string
  attribution?: string
}

function parseCSV(filePath: string): ImageMapping[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').slice(1) // Skip header

  return lines
    .filter(line => line.trim())
    .map(line => {
      const [id, imageUrl, source, attribution] = line.split(',')
      return { id, imageUrl, source, attribution }
    })
}

async function updateCarImages() {
  console.log('🚗 Updating car images...')

  const csvPath = path.join(process.cwd(), 'gt7data', 'car_image_urls.csv')
  const mappings = parseCSV(csvPath)

  let updated = 0
  let errors = 0

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('Car')
      .update({
        imageUrl: mapping.imageUrl,
        imageSource: mapping.source,
        imageAttribution: mapping.attribution
      })
      .eq('id', mapping.id)

    if (error) {
      console.error(`✗ Car ${mapping.id}:`, error.message)
      errors++
    } else {
      console.log(`✓ Car ${mapping.id}`)
      updated++
    }
  }

  console.log(`\nCars: ${updated} updated, ${errors} errors`)
}

async function updateTrackImages() {
  console.log('\n🛣️  Updating track images...')

  const csvPath = path.join(process.cwd(), 'gt7data', 'track_image_urls.csv')
  const mappings = parseCSV(csvPath)

  let updated = 0
  let errors = 0

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('Track')
      .update({
        imageUrl: mapping.imageUrl,
        imageSource: mapping.source,
        imageAttribution: mapping.attribution
      })
      .eq('id', mapping.id)

    if (error) {
      console.error(`✗ Track ${mapping.id}:`, error.message)
      errors++
    } else {
      console.log(`✓ Track ${mapping.id}`)
      updated++
    }
  }

  console.log(`\nTracks: ${updated} updated, ${errors} errors`)
}

async function main() {
  try {
    await updateCarImages()
    await updateTrackImages()
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
```

---

### Component: Image with Fallback

```typescript
// src/components/ui/ImageWithFallback.tsx

/**
 * Image with Fallback Placeholder
 *
 * Displays image with graceful fallback to placeholder on error
 */

import { useState } from 'react'
import { Car, MapPin } from 'lucide-react'

interface ImageWithFallbackProps {
  src?: string | null
  alt: string
  type: 'car' | 'track'
  className?: string
}

export function ImageWithFallback({ src, alt, type, className = '' }: ImageWithFallbackProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    const Icon = type === 'car' ? Car : MapPin
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
      loading="lazy"
    />
  )
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/imageWithFallback.test.tsx

import { render, screen } from '@testing-library/react'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'

describe('ImageWithFallback', () => {
  it('displays image when src is provided and loads successfully', () => {
    render(<ImageWithFallback src="/car.jpg" alt="Test Car" type="car" />)
    const img = screen.getByAltText('Test Car')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/car.jpg')
  })

  it('displays fallback when src is null', () => {
    render(<ImageWithFallback src={null} alt="Test Car" type="car" />)
    expect(screen.getByRole('img')).not.toBeInTheDocument()
  })

  it('displays fallback when image fails to load', () => {
    render(<ImageWithFallback src="/broken.jpg" alt="Test Car" type="car" />)
    // Simulate error event...
    expect(screen.getByRole('img')).not.toBeInTheDocument()
  })
})
```

### Manual Testing Checklist

- [ ] Car images load on build list page
- [ ] Car images load on build detail page
- [ ] Track images load on race detail page
- [ ] Track images load on track list page
- [ ] Broken images show fallback placeholder
- [ ] Images load on mobile (responsive)
- [ ] Page load performance is acceptable
- [ ] No console errors related to images
- [ ] Hotlinking is not blocked (test in production)

---

## Maintenance and Updates

### Ongoing Tasks

1. **Monitor Link Rot**
   - Periodically check image URLs (monthly cron job)
   - Alert on broken links
   - Update with new URLs as needed

2. **New Cars/Tracks**
   - When GT7 updates add new content
   - Add image URLs to mapping CSV
   - Run import script

3. **Performance Optimization**
   - Consider implementing CDN for hosted images
   - Add image caching headers
   - Lazy load images below fold

### Monitoring Script

```typescript
// scripts/check-image-urls.ts

/**
 * Check Image URL Health
 *
 * Tests all image URLs in database and reports broken links
 */

import { createClient } from '@supabase/supabase-js'

async function checkImageUrls() {
  const supabase = createClient(/* ... */)

  // Check cars
  const { data: cars } = await supabase
    .from('Car')
    .select('id, name, imageUrl')
    .not('imageUrl', 'is', null)

  for (const car of cars || []) {
    try {
      const response = await fetch(car.imageUrl!, { method: 'HEAD' })
      if (!response.ok) {
        console.log(`BROKEN: ${car.name} - ${car.imageUrl}`)
      }
    } catch {
      console.log(`ERROR: ${car.name} - ${car.imageUrl}`)
    }
  }
}

checkImageUrls()
```

---

## Summary and Next Steps

### Recommended Approach: **URL-Only Storage with Fallbacks**

**Rationale:**
- ✅ Legally safer (not hosting copyrighted material)
- ✅ No storage costs
- ✅ Simple implementation
- ✅ Easy to maintain

**Implementation Steps:**
1. Manually map car IDs to KudosPrime URLs (spreadsheet)
2. Manually map track IDs to GT Wiki gallery URLs (spreadsheet)
3. Create import script to update database
4. Update frontend components to display images with fallbacks
5. Test thoroughly
6. Deploy and monitor

**Estimated Timeline:** 2-3 weeks

**Potential Issues:**
- Hotlinking may be blocked (need fallback)
- Images may change or be removed (ongoing maintenance)
- Legal gray area (but minimal risk with attribution)

**Alternative Consideration:**
If URL-only approach proves unreliable, consider:
1. Official partnership with Sony/Polyphony
2. User-generated image uploads
3. Commission custom artwork (expensive but legally clear)

---

## Sources

### Research Sources

- [Gran Turismo 7 Car List](https://www.gran-turismo.com/gb/gt7/carlist/) - Official car listings
- [Gran Turismo 7 Track List](https://www.gran-turismo.com/gb/gt7/tracklist/) - Official track listings
- [KudosPrime GT7 Car List](https://www.kudosprime.com/gt7/carlist.php) - Fan database with images
- [Gran Turismo Wiki - GT7 Track List](https://gran-turismo.fandom.com/wiki/Gran_Turismo_7/Track_List) - Community wiki with galleries
- [GT7Info](https://ddm999.github.io/gt7info/) - Community GT7 reference
- [Is Web Scraping Legal? 2025 Guide](https://www.scraperapi.com/web-scraping/is-web-scraping-legal/) - Legal considerations
- [Web Scraping Legal Issues 2025](https://groupbwt.com/blog/is-web-scraping-legal/) - Compliance guide

### Image Quality References

- **KudosPrime:** High-quality consistent images, recommended primary source
- **GT Wiki:** Variable quality, good fallback for tracks
- **Official Site:** Highest quality but may block hotlinking

---

**End of Plan**
