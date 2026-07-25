import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { ShapePath } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { LAYER_INDEXES } from "../../../lib/layer-indexes"
import circuitJson from "../../examples/example02/example02.circuit.json" with {
  type: "json",
}

const replacementPath = {
  type: "pcb_fabrication_note_path",
  pcb_fabrication_note_path_id: "pcb_fabrication_note_path_cross_cut_0",
  pcb_component_id: "pcb_component_0",
  layer: "top",
  route: [
    { x: 0, y: -0.75 },
    { x: 0, y: 0.75 },
  ],
  stroke_width: 0.5,
  role: "copper_cut_fill",
  replaces_pcb_trace_id: "source_trace_0_0",
}

const collectShapes = (children: unknown[]): ShapePath[] =>
  children.flatMap((child) => {
    if (child instanceof ShapePath) return [child]
    if (
      child &&
      typeof child === "object" &&
      "children" in child &&
      Array.isArray(child.children)
    ) {
      return collectShapes(child.children)
    }
    return []
  })

test("replaces normal copper fill with one filled cross-cut pill", async () => {
  const project = await convertCircuitJsonToLbrn(
    [...circuitJson, replacementPath] as unknown as CircuitJson,
    {
      includeLayers: ["top"],
      includeCopper: true,
      includeCopperCutFill: true,
      copperCutFillMargin: 0.5,
      origin: { x: 0, y: 0 },
    },
  )
  const shapes = collectShapes(project.children)
  const copperFillShapes = shapes.filter(
    (shape) => shape.cutIndex === LAYER_INDEXES.topCopperCutFill,
  )

  expect(copperFillShapes).toHaveLength(1)
  expect(copperFillShapes[0]?.isClosed).toBe(true)
  expect(copperFillShapes[0]?.verts.at(-1)).toEqual(
    copperFillShapes[0]?.verts[0],
  )

  const xs = copperFillShapes[0]!.verts.map((vertex) => vertex.x)
  const ys = copperFillShapes[0]!.verts.map((vertex) => vertex.y)
  expect(Math.min(...xs)).toBeCloseTo(-0.25)
  expect(Math.max(...xs)).toBeCloseTo(0.25)
  expect(Math.min(...ys)).toBeCloseTo(-1)
  expect(Math.max(...ys)).toBeCloseTo(1)

  expect(
    shapes.some((shape) => shape.cutIndex === LAYER_INDEXES.topCopper),
  ).toBe(true)
})

test("rejects a copper fill replacement for an unknown trace", async () => {
  await expect(
    convertCircuitJsonToLbrn(
      [
        ...circuitJson,
        { ...replacementPath, replaces_pcb_trace_id: "missing_trace" },
      ] as unknown as CircuitJson,
      {
        includeLayers: ["top"],
        includeCopper: true,
        includeCopperCutFill: true,
      },
    ),
  ).rejects.toThrow(
    "Copper cut fill replacement references unknown trace missing_trace",
  )
})
