# Serialization

Defined in `src/components/canvas/utils/serialization.ts` and `src/lib/storage/`.

## SerializedProject Format

```typescript
{
  version: 2,                          // Format version
  pixelsPerMeter: number | null,       // Scale (null if uncalibrated)
  backgroundImage: string | null,      // Base64 data URL
  savedAt: string,                     // ISO 8601 timestamp
  objects: SerializedObject[],         // All objects
  id?: string                          // IndexedDB key (only when stored)
}
```

## SerializedObject Variants

### SerializedShape

```typescript
{
  id: number, type: 'shape', name: string,
  left: number, top: number, scaleX: number, scaleY: number, angle: number,
  widthM: number,          // Real-world width in meters
  heightM: number,         // Real-world height in meters
  color: string,           // Fill color (RGBA)
  baseWidthPx: number,     // Original pixel width before scaling
  baseHeightPx: number,    // Original pixel height before scaling
  width: number,           // Current Fabric rect width
  height: number           // Current Fabric rect height
}
```

### SerializedLine

```typescript
{
  id: number, type: 'line', name: string,
  left: number, top: number, scaleX: number, scaleY: number, angle: number,
  x1: number, y1: number,  // Start point
  x2: number, y2: number,  // End point
  lengthM: number,          // Length in meters
  color: string,            // Stroke color
  strokeWidth: number       // Stroke width in pixels
}
```

### SerializedMask

```typescript
{
  id: number, type: 'mask', name: string,
  left: number, top: number, scaleX: number, scaleY: number, angle: number,
  width: number,            // Computed: fabricWidth * scaleX
  height: number            // Computed: fabricHeight * scaleY
}
```

### SerializedImage

```typescript
{
  id: number, type: 'backgroundImage' | 'overlayImage', name: string,
  left: number, top: number, scaleX: number, scaleY: number, angle: number,
  imageData: string,        // Base64 data URL
  originX: string,          // 'left' | 'center' | 'right'
  originY: string           // 'top' | 'center' | 'bottom'
}
```

## Backward Compatibility

The format uses `version: 2`, which is compatible with the original vanilla JavaScript version of the app. The serialized JSON structure is the same, so projects exported from the vanilla app can be imported into this Next.js version and vice versa.

## Export Flow

```
User clicks Save or Export
  --> PlannerCanvas.save() / exportJson()
    --> usePlannerStore.getState() -- get all metadata
    --> Array.from(objects.values()) -- collect objects
    --> serializeProject(pixelsPerMeter, backgroundImageData, objects, getFabricState)
      --> For each object:
        --> getFabricState(id) -- extracts left/top/scaleX/scaleY/angle + type-specific fields
        --> serializeObject(obj, fabricState) -- merges metadata + Fabric state
      --> Returns SerializedProject { version: 2, ... }
    --> saveToIDB(data) -- IndexedDB write
       OR downloadProjectAsJson(data) -- triggers browser download
```

## Import Flow

```
User clicks Load or Import
  --> PlannerCanvas.load() / importJson(file)
    --> loadFromIDB() / importProjectFromFile(file)
    --> validateProjectData(data) -- structural validation
    --> Clear current state:
      --> Delete all Fabric objects from canvas
      --> Clear allFabricRefsRef Map
      --> clearObjects() on store
    --> deserializeProject(data)
      --> Returns { pixelsPerMeter, backgroundImageData, objects[], serializedObjects[] }
    --> setPixelsPerMeter(pixelsPerMeter)
    --> If backgroundImageData: loadBackgroundFromData(data, onComplete)
    --> loadProjectFromData(serializedObjects)
      --> For each serialized object, dispatch to hook loader:
        --> 'shape' -> shapes.loadShape(sObj)
        --> 'line' -> lines.loadLine(sObj)
        --> 'mask' -> cleanup.loadMask(sObj)
        --> 'backgroundImage'/'overlayImage' -> images.loadImageObject(sObj)
    --> reorderObjects() -- enforce z-order
    --> canvas.renderAll()
```

## Storage

### IndexedDB (`lib/storage/indexeddb.ts`)

| Function | Description |
|---|---|
| `openDatabase()` | Opens `OutdoorPlannerDB` v1, auto-creates `projects` object store |
| `saveProject(data)` | Stores project with key `'outdoor-planner-project'` |
| `loadProject()` | Retrieves saved project or `null` |
| `clearProject()` | Deletes saved project |
| `checkProjectExists()` | Returns project data or `null` (with error handling) |

### JSON Export (`lib/storage/json-export.ts`)

| Function | Description |
|---|---|
| `downloadProjectAsJson(data)` | Triggers browser download as `outdoor-planner-YYYY-MM-DD.json` |
| `importProjectFromFile(file)` | Reads JSON file, validates, returns `SerializedProject` |

### Auto-Save

- Triggered after object create/modify/delete events
- Debounced with `AUTOSAVE_DEBOUNCE_MS` (2000ms)
- Only active when `autoSaveEnabled` is true
- Writes to IndexedDB using the same `saveProject()` function
