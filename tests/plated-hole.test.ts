import { test, expect } from "bun:test"
import { convertCircuitJsonToLbrn } from "../lib/index"
import type { CircuitJson } from "circuit-json"

test("plated hole generates circular path", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "test_board",
      width: 100,
      height: 100,
      center: { x: 0, y: 0 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      shape: "circle",
      pcb_plated_hole_id: "test_hole",
      outer_diameter: 2,
      hole_diameter: 1,
      x: 10,
      y: 20,
      layers: ["top"],
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)

  // Should have 1 CutSetting and 1 ShapePath
  expect(project.children.length).toBe(2)

  // First child should be CutSetting
  const cutSetting = project.children.find(
    (child) => child.token === "CutSetting",
  )!
  expect(cutSetting.token).toBe("CutSetting")

  // Second child should be ShapePath (the plated hole)
  const shapePath = project.children.find(
    (child) => child.token === "Shape.Path",
  )!
  expect(shapePath.token).toBe("Shape.Path")

  // Verify the shape path has the expected properties
  if (shapePath.token === "Shape.Path") {
    expect((shapePath as any).isClosed).toBe(true)
    expect((shapePath as any).cutIndex).toBe(0)
    expect((shapePath as any).verts).toBeDefined()
    expect((shapePath as any).prims).toBeDefined()

    // Should have 5 vertices (4 bezier curve points + 1 to close)
    const vertsLength = (shapePath as any).verts?.length
    const primsLength = (shapePath as any).prims?.length
    expect(vertsLength).toBe(5)
    expect(primsLength).toBe(4)

    // Verify all primitives are bezier curves
    const prims = (shapePath as any).prims || []
    for (const prim of prims) {
      expect(prim.type).toBe(1) // 1 = BezierTo
    }

    // Verify the circle is centered at (10, 20) with radius 1
    const firstVert = (shapePath as any).verts?.[0]
    expect(firstVert?.x).toBeCloseTo(11, 5) // 10 + 1 (radius)
    expect(firstVert?.y).toBeCloseTo(20, 5)
  }
})
