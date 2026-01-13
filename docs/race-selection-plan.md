# Race Selection Feature Plan

## Overview
Add functionality to select existing races when adding entries to run lists, alongside the existing "create new race" flow.

## Current State
- **UI**: Only allows creating races by selecting track + car combinations
- **API**: Already supports `raceId` parameter in POST `/api/run-lists/[id]/entries`
- **Data**: `/api/races` endpoint exists with full race data

## Proposed Solution

### 1. Mode Toggle UI
Add a toggle switch to let users choose between two modes:
- **Create New Race** (current flow): Select track → Add cars → Create
- **Select Existing Race**: Choose from existing races

**Location**: Top of the "Add Race" section, above track selection

**Component**: Segmented control or tabs:
```
[ Create New Race ] [ Select Existing Race ]
```

### 2. Race Selection Mode UI

When "Select Existing Race" is active:

#### Race Dropdown
- Use existing `SearchableComboBox` component
- Fetch races from `/api/races`
- Display format: `{Track Name} + {Car 1}, {Car 2}, etc.`
- Filter/search by:
  - Track name
  - Car names
  - Race name (if custom name exists)
  - Currently filtered by same criteria as main race list

#### Race Preview Card
When a race is selected, show a preview card with:
- Track name and location
- All cars in the race (with builds if applicable)
- Number of run lists already using this race
- Link to view full race details

#### Notes Field
- Keep the existing notes input
- Allow adding notes specific to this run list entry

#### Submit Button
- "Add to Run List" (same as current)

### 3. Data Flow

#### Select Existing Race Flow:
```
1. User toggles to "Select Existing Race" mode
2. Dropdown fetches and displays all available races
3. User selects a race → Preview card shows details
4. User optionally adds notes
5. User clicks "Add to Run List"
6. API call with raceId parameter
```

#### API Request (Existing Race):
```typescript
POST /api/run-lists/[id]/entries
{
  raceId: "selected-race-id",
  notes: "optional notes"
}
```

### 4. API Changes

**Current API**: Already supports `raceId` parameter - **NO CHANGES NEEDED**

The existing logic at lines 156-167 of `/api/run-lists/[id]/entries/route.ts`:
```typescript
} else {
  // Validate the provided raceId exists
  const { data: race } = await supabase
    .from('Race')
    .select('id')
    .eq('id', finalRaceId)
    .single()

  if (!race) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 })
  }
}
```

### 5. Component Structure

```
<AddRaceSection>
  <ModeToggle>
    <Tab>Create New Race</Tab>
    <Tab>Select Existing Race</Tab>
  </ModeToggle>

  {mode === 'create' && (
    <CreateNewRaceFlow>
      {/* Current track + car selection UI */}
    </CreateNewRaceFlow>
  )}

  {mode === 'select' && (
    <SelectExistingRaceFlow>
      <RaceSearchableComboBox />
      {selectedRace && (
        <RacePreviewCard race={selectedRace} />
      )}
      <NotesInput />
      <AddButton>Add to Run List</AddButton>
    </SelectExistingRaceFlow>
  )}
</AddRaceSection>
```

### 6. State Management

Add to existing state in `/src/app/run-lists/[id]/page.tsx`:

```typescript
// New state for race selection mode
const [addMode, setAddMode] = useState<'create' | 'select'>('create')
const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)
const [selectedRace, setSelectedRace] = useState<Race | null>(null)
```

### 7. Filtering and Display

#### Race Display Format
For the dropdown, use the existing `getDisplayName` logic:
```typescript
const getRaceDisplayName = (race: Race): string => {
  if (race.name) return race.name

  const trackName = race.track?.name || 'Unknown Track'
  const carNames = race.RaceCar.map(rc =>
    `${rc.car.manufacturer} ${rc.car.name}`
  ).join(', ')

  return `${trackName} + ${carNames}`
}
```

#### Filtering Options
Consider adding filters to the race dropdown:
- Filter by track category (Road/Circuit/Street/Dirt)
- Filter by car category (Gr.1/Gr.2/Gr.3/Gr.4/N)
- Show only races I've created
- Show races already in this run list (with indicator)

### 8. Edge Cases

#### Empty State
- No races available: Show message "No races found. Create a new race instead."
- Link to switch to create mode

#### Loading States
- Fetching races: Show loading spinner in dropdown
- Adding entry: Disable submit button, show loading state

#### Error Handling
- Race deleted between selection and submit: Show error "Race no longer exists"
- Network error: Show toast message

#### Validation
- Prevent adding same race twice to same run list
- Check if race is already in run list (show indicator if so)

### 9. User Experience Enhancements

#### Recent Races
- Show "Recently Used Races" quick-select section
- Based on races added to user's other run lists
- Limit to 5 most recent

#### Favorites
- Allow starring races for quick access
- Show starred races at top of dropdown

#### Race Info Tooltip
- Hover over race in dropdown → show tooltip with:
  - Track location
  - Cars in race
  - Number of run lists using it

### 10. Implementation Order

1. **Phase 1**: Basic race selection
   - Add mode toggle
   - Implement race dropdown
   - Add race preview card
   - Wire up API call with raceId

2. **Phase 2**: Enhanced UX
   - Add race filters
   - Show "already in run list" indicator
   - Add recent races section

3. **Phase 3**: Advanced features
   - Race favorites
   - Race info tooltips
   - Bulk add multiple races

## Files to Modify

### Primary Files
1. `/src/app/run-lists/[id]/page.tsx`
   - Add mode toggle UI
   - Add race selection dropdown
   - Add race preview card
   - Update submit logic to handle both modes

### New Components (Optional)
2. `/src/components/run-lists/RaceSearchableComboBox.tsx` (if extracting)
3. `/src/components/run-lists/RacePreviewCard.tsx` (if extracting)

### API Files
- No changes needed (already supports raceId parameter)

## Testing Checklist

- [ ] Toggle between create/select modes
- [ ] Search and filter races in dropdown
- [ ] Select race and see preview
- [ ] Add selected race to run list
- [ ] Verify race appears in run list
- [ ] Test with races that have custom names
- [ ] Test with races with multiple cars
- [ ] Test with races that have builds
- [ ] Verify notes are saved
- [ ] Test duplicate race detection (if implemented)
- [ ] Test error states (race deleted, network error)
- [ ] Verify permissions (only owner can add)
- [ ] Test on mobile responsive

## Benefits

1. **Faster entry creation**: Skip track/car selection for existing races
2. **Race consistency**: Reuse exact same race configurations
3. **Better discoverability**: See what races already exist
4. **Reduced duplication**: Avoid creating duplicate race combinations
5. **Improved UX**: More intuitive for users who just want to add existing races
