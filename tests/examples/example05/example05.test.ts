import { test, expect } from "bun:test"
import circuitJson from "./example05.circuit.json" with { type: "json" }
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import {
  calculateCircuitBounds,
  calculateOriginFromBounds,
} from "lib/calculateBounds"
import { cju } from "@tscircuit/circuit-json-util"
import type { CircuitJson } from "circuit-json"

test("example05 - copper fill conversion", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    copperCutFillMargin: 0.5,
    includeCopperCutFill: true,
  })

  Bun.write("tmp/example05.lbrn2", project.getString(), {
    createPath: true,
  })
  console.log("tmp/example05.lbrn2")

  // Calculate actual board bounds with origin transformation (same as index.ts)
  const db = cju(circuitJson as CircuitJson)
  const board = db.pcb_board.list()[0]
  const bounds = calculateCircuitBounds(circuitJson as CircuitJson)
  const origin = calculateOriginFromBounds(bounds, undefined)

  let boardMinX = 0,
    boardMinY = 0,
    boardMaxX = 0,
    boardMaxY = 0
  if (board && board.width && board.height && board.center) {
    const halfWidth = board.width / 2
    const halfHeight = board.height / 2
    boardMinX = board.center.x - halfWidth + origin.x
    boardMinY = board.center.y - halfHeight + origin.y
    boardMaxX = board.center.x + halfWidth + origin.x
    boardMaxY = board.center.y + halfHeight + origin.y
  }

  // Get the copper cut fill shapes (cut index 4) and verify they're within board bounds
  const copperCutFillCutIndex = 4 // "Top Copper Cut Fill" cut setting

  // Collect all vertices from copper cut fill shapes
  const collectShapeVertices = (
    shapes: any[],
  ): Array<{ x: number; y: number }> => {
    const vertices: Array<{ x: number; y: number }> = []
    for (const shape of shapes) {
      if (shape.cutIndex === copperCutFillCutIndex && shape.verts) {
        for (const vert of shape.verts) {
          vertices.push({ x: vert.x, y: vert.y })
        }
      } else if (shape.children) {
        vertices.push(...collectShapeVertices(shape.children))
      }
    }
    return vertices
  }

  const copperFillVertices = collectShapeVertices(project.children as any)

  // All copper cut fill vertices should be within board bounds
  // Allow small tolerance for floating point
  const tolerance = 0.001
  for (const { x, y } of copperFillVertices) {
    expect(x).toBeGreaterThanOrEqual(boardMinX - tolerance)
    expect(x).toBeLessThanOrEqual(boardMaxX + tolerance)
    expect(y).toBeGreaterThanOrEqual(boardMinY - tolerance)
    expect(y).toBeLessThanOrEqual(boardMaxY + tolerance)
  }

  const lbrnSvg = generateLightBurnSvg(project, {
    margin: 0,
    width: 600,
    height: 400,
    defaultStrokeWidth: 0.03,
  })

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)
})
