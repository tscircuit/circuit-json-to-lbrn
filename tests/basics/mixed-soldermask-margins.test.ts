import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_mixed",
    width: 30,
    height: 30,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  // Circle SMT pad without soldermask_margin
  {
    type: "pcb_smtpad",
    x: -6,
    y: 6,
    layer: "top",
    shape: "circle",
    pcb_smtpad_id: "smt_pad_circle_no_margin",
    radius: 1,
    port_hints: ["port1"],
  },
  // Rect SMT pad with soldermask_margin
  {
    type: "pcb_smtpad",
    x: -2,
    y: 6,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "smt_pad_rect_with_margin",
    width: 2,
    height: 1.5,
    soldermask_margin: 0.1,
    port_hints: ["port2"],
  },
  // Plated hole circle without soldermask_margin
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated_hole_circle_no_margin",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_3",
    outer_diameter: 3,
    hole_diameter: 1.5,
    shape: "circle",
    port_hints: ["port3"],
    x: 2,
    y: 6,
    layers: ["top", "bottom"],
  },
  // Via without soldermask_margin
  {
    type: "pcb_via",
    pcb_via_id: "via_no_margin",
    x: -4,
    y: -4,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "hole1",
    x: 6,
    y: 2,
    hole_shape: "rect",
    hole_width: 2,
    hole_height: 4,
    soldermask_margin: 0.3,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "hole2",
    x: 6,
    y: -6,
    hole_shape: "circle",
    hole_diameter: 3,
  },

  {
    type: "pcb_cutout",
    pcb_cutout_id: "1",
    center: {
      x: 12,
      y: -5,
    },
    shape: "circle",
    radius: 2,
  },
]

test("renders mixed elements with global and per-element soldermask margins", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeSoldermask: true,
    globalCopperSoldermaskMarginAdjustment: 0.2,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
