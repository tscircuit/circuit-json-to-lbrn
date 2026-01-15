import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("copper-fill with vias", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
    {
      type: "source_trace",
      source_trace_id: "trace_1",
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    },
    // Via connected to trace
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      pcb_trace_id: "trace_1",
      x: -3,
      y: 0,
      outer_diameter: 1.2,
      hole_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    // Via not connected (standalone)
    {
      type: "pcb_via",
      pcb_via_id: "via_2",
      x: 3,
      y: 0,
      outer_diameter: 1.0,
      hole_diameter: 0.5,
      layers: ["top", "bottom"],
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    copperFillExpansion: 0.5, // 0.5mm expansion around vias
    laserSpotSize: 0.005,
    includeLayers: ["top"],
  })

  Bun.write("debug-output/copper-fill-vias.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
