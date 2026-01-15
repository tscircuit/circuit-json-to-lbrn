import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("copper-fill with plated holes", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
    // Circle plated hole
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_1",
      x: -4,
      y: 0,
      shape: "circle",
      outer_diameter: 2.0,
      hole_diameter: 1.0,
      layers: ["top", "bottom"],
    },
    // Circular hole with rect pad
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_2",
      x: 0,
      y: 0,
      shape: "circular_hole_with_rect_pad",
      hole_diameter: 1.0,
      rect_pad_width: 2.5,
      rect_pad_height: 1.8,
      layers: ["top", "bottom"],
    },
    // Pill plated hole
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_3",
      x: 4,
      y: 0,
      shape: "pill",
      outer_width: 2.0,
      outer_height: 3.0,
      hole_width: 1.0,
      hole_height: 2.0,
      layers: ["top", "bottom"],
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    copperFillExpansion: 0.5, // 0.5mm expansion around plated holes
    laserSpotSize: 0.005,
    includeLayers: ["top"],
  })

  Bun.write(
    "debug-output/copper-fill-plated-holes.lbrn2",
    project.getString(),
    {
      createPath: true,
    },
  )

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
