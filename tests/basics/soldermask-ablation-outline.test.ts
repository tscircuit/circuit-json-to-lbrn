import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToLbrn } from "../../lib/index"
import { LAYER_INDEXES } from "../../lib/layer-indexes"
import circuitJson from "../examples/example05/example05.circuit.json" with {
  type: "json",
}

type ProjectNode = {
  children?: ProjectNode[]
  cutIndex?: number
  index?: number
  name?: string
  type?: string
  verts?: Array<{ x: number; y: number }>
}

const flattenProject = (nodes: ProjectNode[]): ProjectNode[] =>
  nodes.flatMap((node) => [node, ...flattenProject(node.children ?? [])])

const getBounds = (nodes: ProjectNode[]) => {
  const vertices = nodes.flatMap((node) => node.verts ?? [])
  return {
    minX: Math.min(...vertices.map((vertex) => vertex.x)),
    maxX: Math.max(...vertices.map((vertex) => vertex.x)),
    minY: Math.min(...vertices.map((vertex) => vertex.y)),
    maxY: Math.max(...vertices.map((vertex) => vertex.y)),
  }
}

test("creates a 1mm top soldermask ablation outer outline", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeSoldermaskAblation: true,
    soldermaskAblationClearance: 1,
    origin: { x: 0, y: 0 },
  })
  const projectNodes = flattenProject(project.children as ProjectNode[])

  expect(
    projectNodes.find(
      (node) => node.index === LAYER_INDEXES.topSoldermaskAblation,
    ),
  ).toMatchObject({
    name: "Top Soldermask Ablation",
    type: "Scan",
  })

  const copperShapes = projectNodes.filter(
    (node) => node.cutIndex === LAYER_INDEXES.topCopper,
  )
  const ablationOutlineShapes = projectNodes.filter(
    (node) => node.cutIndex === LAYER_INDEXES.topSoldermaskAblation,
  )

  expect(ablationOutlineShapes).toHaveLength(1)

  const copperBounds = getBounds(copperShapes)
  const outlineBounds = getBounds(ablationOutlineShapes)
  expect(copperBounds.minX - outlineBounds.minX).toBeCloseTo(1, 1)
  expect(outlineBounds.maxX - copperBounds.maxX).toBeCloseTo(1, 1)
  expect(copperBounds.minY - outlineBounds.minY).toBeCloseTo(1, 1)
  expect(outlineBounds.maxY - copperBounds.maxY).toBeCloseTo(1, 1)
})
