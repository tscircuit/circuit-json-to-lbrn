import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { CutSetting, ShapePath } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { LAYER_INDEXES } from "../../lib/layer-indexes"
import circuitJson from "../examples/example02/example02.circuit.json" with {
  type: "json",
}

const getToolingShapes = (projectChildren: unknown[]): ShapePath[] =>
  projectChildren.filter(
    (child): child is ShapePath =>
      child instanceof ShapePath && child.cutIndex === LAYER_INDEXES.tool1,
  )

const board = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const toolingPath = {
  type: "pcb_fabrication_note_path",
  pcb_fabrication_note_path_id: "pcb_fabrication_note_path_tooling_0",
  pcb_component_id: "pcb_component_0",
  layer: "top",
  route: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
  ],
  stroke_width: 1,
  role: "tooling",
}

test("copies selected component copper lands to native LightBurn T1", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    origin: { x: 0, y: 0 },
    includeLayers: ["top"],
    toolingLayerIncludeRefs: [".TP1"],
  })

  const toolSetting = project.children.find(
    (child): child is CutSetting =>
      child instanceof CutSetting && child.index === LAYER_INDEXES.tool1,
  )
  expect(toolSetting).toMatchObject({ type: "Tool", name: "T1" })

  const toolShapes = getToolingShapes(project.children)
  expect(toolShapes).toHaveLength(1)

  const xs = toolShapes[0]!.verts.map((vertex) => vertex.x)
  const ys = toolShapes[0]!.verts.map((vertex) => vertex.y)
  expect(Math.min(...xs)).toBeCloseTo(-2.6)
  expect(Math.max(...xs)).toBeCloseTo(-1.4)
  expect(Math.min(...ys)).toBeCloseTo(-0.6)
  expect(Math.max(...ys)).toBeCloseTo(0.6)

  const xml = project.getString()
  expect(xml).toContain('<CutSetting type="Tool">')
  expect(xml).toContain('<index Value="30"/>')
  expect(xml).toContain('<name Value="T1"/>')
  expect(xml).toContain('Shape Type="Path" CutIndex="30"')
})

test("puts tooling fabrication paths on native LightBurn T1", async () => {
  const project = await convertCircuitJsonToLbrn(
    [board, toolingPath] as unknown as CircuitJson,
    { origin: { x: 0, y: 0 }, includeLayers: ["top"] },
  )

  const toolSetting = project.children.find(
    (child): child is CutSetting =>
      child instanceof CutSetting && child.index === LAYER_INDEXES.tool1,
  )
  expect(toolSetting?.type).toBe("Tool")
  expect(toolSetting?.name).toBe("T1")

  const toolShapes = getToolingShapes(project.children)
  expect(toolShapes).toHaveLength(1)

  const xs = toolShapes[0]!.verts.map((vertex) => vertex.x)
  const ys = toolShapes[0]!.verts.map((vertex) => vertex.y)
  expect(Math.min(...xs)).toBeCloseTo(-0.5)
  expect(Math.max(...xs)).toBeCloseTo(2.5)
  expect(Math.min(...ys)).toBeCloseTo(-0.5)
  expect(Math.max(...ys)).toBeCloseTo(0.5)

  const xml = project.getString()
  expect(xml).toContain('<CutSetting type="Tool">')
  expect(xml).toContain('<index Value="30"/>')
  expect(xml).toContain('<name Value="T1"/>')
  expect(xml).toContain('Shape Type="Path" CutIndex="30"')
})

test("supports multiple ref selectors without changing Circuit JSON", async () => {
  const inputBeforeConversion = JSON.stringify(circuitJson)
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    origin: { x: 0, y: 0 },
    includeLayers: ["top"],
    toolingLayerIncludeRefs: [".TP1", ".TP2", ".TP3"],
  })

  expect(getToolingShapes(project.children)).toHaveLength(3)
  expect(JSON.stringify(circuitJson)).toBe(inputBeforeConversion)
})

test("omits T1 when the circuit has no selected tooling", async () => {
  const withoutTooling = await convertCircuitJsonToLbrn(
    circuitJson as CircuitJson,
  )
  const excludedTopRef = await convertCircuitJsonToLbrn(
    circuitJson as CircuitJson,
    {
      includeLayers: ["bottom"],
      toolingLayerIncludeRefs: [".TP1"],
    },
  )

  for (const project of [withoutTooling, excludedTopRef]) {
    expect(project.getString()).not.toContain('<CutSetting type="Tool">')
    expect(getToolingShapes(project.children)).toHaveLength(0)
  }
})

test("omits T1 when tooling paths are on an excluded board layer", async () => {
  const bottomToolingPath = { ...toolingPath, layer: "bottom" }
  const project = await convertCircuitJsonToLbrn(
    [board, bottomToolingPath] as unknown as CircuitJson,
    { includeLayers: ["top"] },
  )
  const xml = project.getString()

  expect(xml).not.toContain('<CutSetting type="Tool">')
  expect(xml).not.toContain('CutIndex="30"')
})
