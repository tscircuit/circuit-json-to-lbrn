import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("copper-fill with SMT pads", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
    // Rectangle pad
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      x: -4,
      y: 0,
      layer: "top",
      shape: "rect",
      width: 1.5,
      height: 2,
    },
    // Circle pad
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      x: 0,
      y: 0,
      layer: "top",
      shape: "circle",
      radius: 1,
    },
    // Pill pad
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_3",
      x: 4,
      y: 0,
      layer: "top",
      shape: "pill",
      width: 1.5,
      height: 3,
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    copperFillExpansion: 0.5, // 0.5mm expansion around pads
    laserSpotSize: 0.005,
    includeLayers: ["top"],
  })

  Bun.write("debug-output/copper-fill-pads.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
