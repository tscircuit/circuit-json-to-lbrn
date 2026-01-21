import { test, expect } from "bun:test"
import circuitJson from "./example05.circuit.json" with { type: "json" }
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg, ShapePath, ShapeGroup } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("example05 - copper fill conversion", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    copperCutFillMargin: 0.5,
    includeCopperCutFill: true,
  })

  Bun.write("tmp/example05.lbrn2", project.getString(), {
    createPath: true,
  })
  console.log("tmp/example05.lbrn2")

  // Board dimensions: centered at (0,0), width 18, height 23.38
  // With margin adjustment for origin, we need to check the actual bounds
  // The origin adjustment shifts coordinates to be positive
  const boardWidth = 18
  const boardHeight = 23.380000000000003

  // Get the copper cut fill shapes (cut index 4) and verify they're within board bounds
  // Find the copper cut fill cut setting index
  const copperCutFillCutIndex = 4 // "Top Copper Cut Fill" cut setting

  // Collect all vertices from copper cut fill shapes
  const collectShapeVertices = (
    shapes: Array<ShapePath | ShapeGroup>,
  ): Array<[number, number]> => {
    const vertices: Array<[number, number]> = []
    for (const shape of shapes) {
      if (
        shape instanceof ShapePath &&
        shape.cutIndex === copperCutFillCutIndex
      ) {
        for (let i = 0; i < shape.verts.length; i += 2) {
          vertices.push([shape.verts[i]!, shape.verts[i + 1]!])
        }
      } else if (shape instanceof ShapeGroup) {
        vertices.push(...collectShapeVertices(shape.children))
      }
    }
    return vertices
  }

  const copperFillVertices = collectShapeVertices(project.children as any)

  // All copper cut fill vertices should be within board bounds
  // The origin shifts coordinates so they start at (0, 0)
  // Allow small tolerance for floating point
  const tolerance = 0.001
  for (const [x, y] of copperFillVertices) {
    expect(x).toBeGreaterThanOrEqual(-tolerance)
    expect(x).toBeLessThanOrEqual(boardWidth + tolerance)
    expect(y).toBeGreaterThanOrEqual(-tolerance)
    expect(y).toBeLessThanOrEqual(boardHeight + tolerance)
  }

  const lbrnSvg = await generateLightBurnSvg(project, {
    margin: 0,
    width: 600,
    height: 400,
    defaultStrokeWidth: 0.03,
  })

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)
})
