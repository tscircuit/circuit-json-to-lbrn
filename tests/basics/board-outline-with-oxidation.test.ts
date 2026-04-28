import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"
import { LAYER_INDEXES } from "../../lib/layer-indexes"

type LightBurnNode = {
  cutIndex?: number
  verts?: Array<{ x: number; y: number }>
  children?: LightBurnNode[]
}

const collectPathsForCutIndex = (
  nodes: LightBurnNode[],
  cutIndex: number,
): LightBurnNode[] => {
  const paths: LightBurnNode[] = []

  for (const node of nodes) {
    if (node.cutIndex === cutIndex) {
      paths.push(node)
    }
    if (node.children) {
      paths.push(...collectPathsForCutIndex(node.children, cutIndex))
    }
  }

  return paths
}

const circuitJson: CircuitJson = [
  {
    type: "source_port",
    name: "port1",
    source_port_id: "sp1",
  },
  {
    type: "source_port",
    name: "port2",
    source_port_id: "sp2",
  },
  {
    type: "source_trace",
    source_trace_id: "st1",
    connected_source_port_ids: ["sp1", "sp2"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 5, y: 5 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    // Pentagon shape outline: five points, roughly regular pentagon
    outline: [
      { x: 20, y: 0 }, // Top
      { x: 40, y: 12 }, // Upper right
      { x: 32, y: 30 }, // Lower right
      { x: 8, y: 30 }, // Lower left
      { x: 0, y: 12 }, // Upper left
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp1",
    source_port_id: "sp1",
    x: 10,
    y: 5,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp2",
    source_port_id: "sp2",
    x: 30,
    y: 5,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_port_id: "pp1",
    shape: "rect",
    x: 10,
    y: 15,
    width: 2,
    height: 3,
    layer: "top",
  },
]

test("creates board outline cut with oxidation cleaning layer", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeOxidationCleaningLayer: true,
    includeLayers: ["top", "bottom"],
  })

  const expectedOxidationOutline = [
    { x: 20, y: 0 },
    { x: 40, y: 12 },
    { x: 32, y: 30 },
    { x: 8, y: 30 },
    { x: 0, y: 12 },
    { x: 20, y: 0 },
  ]
  expect(
    collectPathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.topOxidationCleaning,
    )[0]?.verts,
  ).toEqual(expectedOxidationOutline)
  expect(
    collectPathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.bottomOxidationCleaning,
    )[0]?.verts,
  ).toEqual(expectedOxidationOutline)

  Bun.write(
    "debug-output/board-outline-with-oxidation.lbrn2",
    project.getString(),
    { createPath: true },
  )

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
