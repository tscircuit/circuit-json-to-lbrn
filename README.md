# circuit-json-to-lbrn

Convert Circuit JSON to LBRN XML for PCB fabrication via laser ablation.

## Usage

```tsx
import { convertCircuitJsonToLbrn } from "circuit-json-to-lbrn"

// Generate copper layer only
const copperLbrn = convertCircuitJsonToLbrn(circuitJson, {
  includeCopper: true,
  includeSoldermask: false,
})

// Generate soldermask layer only (for cutting polyimide sheet)
const soldermaskLbrn = convertCircuitJsonToLbrn(circuitJson, {
  includeCopper: false,
  includeSoldermask: true,
})

// Generate both layers together in one file
const bothLbrn = convertCircuitJsonToLbrn(circuitJson, {
  includeCopper: true,
  includeSoldermask: true,
})

// Default behavior (copper only, backward compatible)
const defaultLbrn = convertCircuitJsonToLbrn(circuitJson)
```

## Options

- `includeCopper?: boolean` - Include copper traces and pads (default: `true`)
- `includeSoldermask?: boolean` - Include soldermask openings for cutting polyimide sheet (default: `false`)
- `includeSilkscreen?: boolean` - Include silkscreen layer (not implemented yet)
- `origin?: { x: number; y: number }` - Set the origin point for the conversion
- `margin?: number` - Set the margin around the PCB
- `traceMargin?: number` - Clearance margin around traces in mm (requires `includeCopper: true`)
- `laserSpotSize?: number` - Laser spot size in mm for crosshatch spacing (default: `0.005`)
- `laserProfile?: { copper?: { speed?: number; numPasses?: number; frequency?: number; pulseWidth?: number }; board?: { speed?: number; numPasses?: number; frequency?: number; pulseWidth?: number } }` - Custom laser cut settings for copper and board operations. Defaults from GitHub issue: copper (speed: 300 mm/s, numPasses: 100, frequency: 20 kHz, pulseWidth: 1 ns), board (speed: 20 mm/s, numPasses: 100, frequency: 20 kHz, pulseWidth: 1 ns). Pulse width is specified in ns. Allows per-user customization for different lasers/lenses.
- `includeLayers?: Array<"top" | "bottom">` - Specify which layers to include (default: `["top", "bottom"]`)

## Soldermask Support

The `includeSoldermask` flag enables generation of soldermask openings for cutting Kapton tape (polyimide sheet). When enabled:
- SMT pads and plated holes will have soldermask openings
- Traces are NOT included in the soldermask layer (to avoid accidental bridging during soldering)
- Holes are always cut through the board regardless of the mode
- **Soldermask shapes are filled (Scan mode)** instead of outlined, which is required for laser-cutting Kapton tape masks where the laser needs to remove material from the pad areas

### Laser Cutting Workflow

The soldermask layer uses LightBurn's "Scan" mode with filled shapes. This is designed for the following workflow:

1. **Generate LBRN file**: Use `includeSoldermask: true` to export filled pad shapes
2. **Laser cut Kapton tape**: The laser will fill/ablate the pad areas.


You can generate:
- **Copper only**: `{ includeCopper: true, includeSoldermask: false }` - Traditional copper cutting
- **Soldermask only**: `{ includeCopper: false, includeSoldermask: true }` - Just Kapton tape (polyimide) cutting patterns (filled shapes)
- **Both**: `{ includeCopper: true, includeSoldermask: true }` - Complete fabrication file with both layers

## Trace Margin Support

The `traceMargin` option enables smart trace rasterization for creating clearance zones around traces. This is essential for laser PCB fabrication to ensure proper electrical isolation between traces.

### How it works

When `traceMargin` is specified:
1. Generates trace geometries at normal width (inner trace union)
2. Generates trace geometries at width + 2×`traceMargin` (outer trace union)
3. Calculates clearance area = outer - inner
4. Outputs clearance area as filled shapes using Scan mode with crosshatch pattern

The crosshatch pattern ablates copper in the margin area, with line spacing determined by `laserSpotSize`.

### Example

```tsx
const lbrn = convertCircuitJsonToLbrn(circuitJson, {
  includeCopper: true,
  traceMargin: 0.2,      // 0.2mm clearance around traces
  laserSpotSize: 0.005,  // 0.005mm spot size (crosshatch spacing)
})
```

This will:
- Cut trace outlines (vector mode)
- Fill 0.2mm margin zones around traces with crosshatch pattern (scan mode)
- Use 0.005mm spacing for the crosshatch lines

**Note:** `traceMargin` requires `includeCopper: true` and will throw an error if copper is disabled.
