import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { LAYER_INDEXES } from "../../../lib/layer-indexes"

type LightBurnNode = {
  cutIndex?: number
  verts?: Array<{ x: number; y: number }>
  children?: LightBurnNode[]
}

const collectShapesForCutIndex = (
  node: LightBurnNode,
  cutIndex: number,
  shapes: LightBurnNode[] = [],
): LightBurnNode[] => {
  if (node.cutIndex === cutIndex && node.verts) {
    shapes.push(node)
  }

  for (const child of node.children ?? []) {
    collectShapesForCutIndex(child, cutIndex, shapes)
  }

  return shapes
}

const createConnectivityPadsCircuitJson = (): {
  circuitJson: CircuitJson
  padCenters: Array<{ x: number; y: number }>
} => {
  const padCenters = [
    { x: 0, y: 31 },
    { x: 46, y: 0 },
    { x: 0, y: -31 },
    { x: -46, y: 0 },
  ]

  return {
    padCenters,
    circuitJson: [
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        width: 40,
        height: 30,
        center: { x: 0, y: 0 },
      },
      ...padCenters.map((center, index) => ({
        type: "pcb_smtpad" as const,
        pcb_smtpad_id: `conductivity_pad_${index}`,
        pcb_component_id: null,
        layer: "top" as const,
        shape: "circle" as const,
        radius: 2.5,
        port_hints: [],
        is_covered_with_solder_mask: false,
        x: center.x,
        y: center.y,
      })),
    ] as CircuitJson,
  }
}

const shapeContainsPoint = (
  shape: LightBurnNode,
  point: { x: number; y: number },
): boolean => {
  const xs = shape.verts?.map((vert) => vert.x) ?? []
  const ys = shape.verts?.map((vert) => vert.y) ?? []

  return (
    xs.length > 0 &&
    ys.length > 0 &&
    point.x >= Math.min(...xs) &&
    point.x <= Math.max(...xs) &&
    point.y >= Math.min(...ys) &&
    point.y <= Math.max(...ys)
  )
}

test("includes conductivity-style pads outside board outline in top copper cut fill", async () => {
  const { circuitJson, padCenters } = createConnectivityPadsCircuitJson()

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeCopperCutFill: true,
    includeLayers: ["top"],
    origin: { x: 0, y: 0 },
    copperCutFillMargin: 0.5,
  })

  const cutFillShapes = collectShapesForCutIndex(
    project as LightBurnNode,
    LAYER_INDEXES.topCopperCutFill,
  )

  expect(cutFillShapes.length).toBeGreaterThan(0)
  for (const center of padCenters) {
    expect(
      cutFillShapes.some((shape) => shapeContainsPoint(shape, center)),
    ).toBe(true)
  }
})

test("can clip copper cut fill to the board outline", async () => {
  const { circuitJson } = createConnectivityPadsCircuitJson()

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeCopperCutFill: true,
    clipCopperCutFillToBoardOutline: true,
    includeLayers: ["top"],
    origin: { x: 0, y: 0 },
    copperCutFillMargin: 0.5,
  })

  expect(
    collectShapesForCutIndex(
      project as LightBurnNode,
      LAYER_INDEXES.topCopperCutFill,
    ),
  ).toHaveLength(0)
})
