# circuit-json-to-lbrn

Convert Circuit JSON to LBRN XML for PCB fabrication via laser ablation.

## Usage

```tsx
import { convertCircuitJsonToLbrn } from "circuit-json-to-lbrn"

// Generate copper layer only (default)
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

// Board outline as soldermask cutout instead of through-board cut
const circuitJsonWithPreset = [
  {
    type: "pcb_board",
    preset: "soldermask_cutout", // Uses soldermask cut settings
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    // ...
  },
  // ... other elements
]

const lbrn = convertCircuitJsonToLbrn(circuitJsonWithPreset, {
  includeCopper: true,
})
```

## Options

- `includeCopper?: boolean` - Include copper traces and pads (default: `true`)
- `includeSoldermask?: boolean` - Include soldermask openings for cutting polyimide sheet (default: `false`)
- `includeSilkscreen?: boolean` - Include silkscreen layer (not implemented yet)
- `origin?: { x: number; y: number }` - Set the origin point for the conversion
- `margin?: number` - Set the margin around the PCB

## Laser Cut Settings

The converter generates three distinct laser cut settings optimized for different materials:

| Index | Name | Passes | Speed | Usage |
|-------|------|--------|-------|-------|
| 0 | Cut Copper | 12 | 100 | Copper traces and pads |
| 1 | Cut Through Board | 3 | 50 | Holes and board outlines |
| 2 | Cut Soldermask | 1 | 150 | Soldermask openings |

These settings ensure each layer is processed with appropriate laser parameters for optimal results.

## Soldermask Support

The `includeSoldermask` flag enables generation of soldermask openings for cutting polyimide sheet. When enabled:
- SMT pads and plated holes will have soldermask openings using the dedicated soldermask cut setting
- Traces are NOT included in the soldermask layer (to avoid accidental bridging during soldering)
- Holes are always cut through the board regardless of the mode
- Soldermask openings are currently created at the same size as copper pads (future versions may add configurable margin)

You can generate:
- **Copper only**: `{ includeCopper: true, includeSoldermask: false }` - Traditional copper cutting
- **Soldermask only**: `{ includeCopper: false, includeSoldermask: true }` - Just polyimide cutting patterns
- **Both**: `{ includeCopper: true, includeSoldermask: true }` - Complete fabrication file with both layers

## Board Outline Presets

Board outlines can use different cut settings via the `preset` field:

- **No preset** (default): Uses "Cut Through Board" setting - cuts completely through the PCB
- **`preset: "soldermask_cutout"`**: Uses "Cut Soldermask" setting - lighter cutting for soldermask layer only

This is useful when you want to define board boundaries on the soldermask layer without cutting through the entire board.
