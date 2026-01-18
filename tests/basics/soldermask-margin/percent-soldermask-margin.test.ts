import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 200,
    height: 200,
    center: { x: 0, y: 0 },
    thickness: 6,
    num_layers: 2,
    material: "fr4",
  },
  // Rect pad: 24mm x 12mm @ -10% → 21.6 x 10.8
  {
    type: "pcb_smtpad",
    x: -70,
    y: 50,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "rect_pad_narrow",
    width: 24,
    height: 12,
  },
  // Square rect pad: 30mm x 30mm @ -10% → 27 x 27
  {
    type: "pcb_smtpad",
    x: -30,
    y: 50,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "rect_pad_square",
    width: 30,
    height: 30,
  },
  // Pill pad: 36mm x 18mm @ -10% → 32.4 x 16.2
  {
    type: "pcb_smtpad",
    x: 10,
    y: 50,
    layer: "top",
    shape: "pill",
    pcb_smtpad_id: "pill_pad",
    width: 36,
    height: 18,
    radius: 9,
  },
  // Circle pad: radius 15mm → diameter 30mm @ -10% → 27mm
  {
    type: "pcb_smtpad",
    x: 50,
    y: 50,
    layer: "top",
    shape: "circle",
    pcb_smtpad_id: "circle_pad",
    radius: 15,
  },
  // Via: outer_diameter 30mm @ -10% → 27mm
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: -50,
    y: -30,
    outer_diameter: 30,
    hole_diameter: 15,
    layers: ["top", "bottom"],
  },
]

test("soldermask renders with correct percent margin", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeSoldermask: true,
    includeCopper: true,
    solderMaskMarginPercent: -20, // negative shrink
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  // Compare stacked SVGs visually to ensure soldermask scaling matches percent margin
  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
