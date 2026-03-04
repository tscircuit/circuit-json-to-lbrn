import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "source_port",
    name: "top_pad",
    source_port_id: "source_port_top",
  },
  {
    type: "source_port",
    name: "bottom_pad",
    source_port_id: "source_port_bottom",
  },
  {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 16,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_smtpad",
    x: -4,
    y: 0,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "pcb_smt_pad_top",
    pcb_port_id: "pcb_port_top",
    width: 2.4,
    height: 1.4,
    soldermask_margin: 0.15,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_top",
    source_port_id: "source_port_top",
    x: -4,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    x: 4,
    y: 0,
    layer: "bottom",
    shape: "circle",
    pcb_smtpad_id: "pcb_smt_pad_bottom",
    pcb_port_id: "pcb_port_bottom",
    radius: 1,
    soldermask_margin: 0.2,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_bottom",
    source_port_id: "source_port_bottom",
    x: 4,
    y: 0,
    layers: ["bottom"],
  },
]

test("renders top and bottom pads with soldermask on the same board", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top", "bottom"],
    includeSoldermask: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
