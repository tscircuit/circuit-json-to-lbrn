import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "source_port",
    name: "pad1",
    source_port_id: "source_port_1",
  },
  {
    type: "source_port",
    name: "pad2",
    source_port_id: "source_port_2",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_1", "source_port_2"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_smtpad",
    x: -2,
    y: 0,
    layer: "top",
    shape: "circle",
    pcb_smtpad_id: "pcb_smt_pad_1",
    pcb_port_id: "pcb_port_1",
    radius: 0.5,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: -2,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    x: 2,
    y: 0,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "pcb_smt_pad_2",
    pcb_port_id: "pcb_port_2",
    width: 1,
    height: 1,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    x: 2,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_1",
    shape: "circle",
    x: 0,
    y: -3,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_1",
    source_trace_id: "source_trace_1",
    route: [
      { x: -2, y: 0, width: 0.2, route_type: "wire", layer: "top" },
      { x: 2, y: 0, width: 0.2, route_type: "wire", layer: "top" },
    ],
  },
]

test("renders soldermask only (no copper, no traces)", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: false,
    includeSoldermask: true,
  })

  // Verify that soldermask elements use soldermaskCutSetting (index 3)
  const soldermaskCutSetting = project.children.find(
    (child: any) => child.name === "Soldermask",
  )
  expect(soldermaskCutSetting).toBeDefined()
  expect((soldermaskCutSetting as any).index).toBe(3)

  const shapePaths = project.children.filter(
    (child: any) => child.isClosed !== undefined,
  )
  const soldermaskShapes = shapePaths.filter((path: any) => path.cutIndex === 3)
  expect(soldermaskShapes.length).toBeGreaterThan(0)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
