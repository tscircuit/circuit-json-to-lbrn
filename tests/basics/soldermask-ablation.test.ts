import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { CutSetting } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
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

test("uses the production soldermask ablation scan settings", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeSoldermaskAblation: true,
  })
  const soldermaskAblation = project.children.find(
    (child): child is CutSetting =>
      child instanceof CutSetting &&
      child.index === LAYER_INDEXES.topSoldermaskAblation,
  )

  expect(soldermaskAblation).toMatchObject({
    type: "Scan",
    speed: 7000,
    frequency: 40000,
    qPulseWidth: 1,
    interval: 0.1,
    numPasses: 5,
    scanOpt: "mergeAll",
    crossHatch: true,
    wobbleEnable: true,
    anglePerPass: 1,
  })

  const xml = project.getString()
  const soldermaskAblationXml = xml.match(
    /<CutSetting type="Scan">\s*<index Value="16"\/>[\s\S]*?<\/CutSetting>/,
  )?.[0]

  expect(soldermaskAblationXml).toContain('<scanOpt Value="mergeAll"/>')
  expect(soldermaskAblationXml).toContain('<crossHatch Value="1"/>')
  expect(soldermaskAblationXml).toContain('<wobbleEnable Value="1"/>')
  expect(soldermaskAblationXml).toContain('<anglePerPass Value="1"/>')
})

test("rejects a negative soldermask ablation clearance", async () => {
  await expect(
    convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
      includeSoldermaskAblation: true,
      soldermaskAblationClearance: -1,
    }),
  ).rejects.toThrow("soldermaskAblationClearance must not be negative")
})
