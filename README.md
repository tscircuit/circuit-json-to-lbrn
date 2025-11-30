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
