import { expect, test } from "bun:test"
import { generateTraceOutline } from "../../lib/element-handlers/addPcbTrace/generateTraceOutline"

test("uses a round join on the outside of a trace bend", () => {
  const polygon = generateTraceOutline({
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ],
    width: 1,
  })

  expect(polygon).not.toBeNull()

  const vertices = polygon!.vertices
  const outerCornerVertices = vertices.filter(
    ({ x, y }) => x >= 2 - 1e-9 && y <= 1e-9,
  )

  expect(outerCornerVertices.length).toBeGreaterThan(2)
  expect(
    outerCornerVertices.every(
      ({ x, y }) => Math.abs(Math.hypot(x - 2, y) - 0.5) < 1e-9,
    ),
  ).toBe(true)
  expect(vertices.some(({ x, y }) => x === 2.5 && y === -0.5)).toBe(false)
  expect(vertices.some(({ x, y }) => x === 1.5 && y === 0.5)).toBe(true)
})

test("rounds the opposite turn direction symmetrically", () => {
  const polygon = generateTraceOutline({
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: -2 },
    ],
    width: 1,
  })

  expect(polygon).not.toBeNull()

  const vertices = polygon!.vertices
  const outerCornerVertices = vertices.filter(
    ({ x, y }) => x >= 2 - 1e-9 && y >= -1e-9,
  )

  expect(outerCornerVertices.length).toBeGreaterThan(2)
  expect(
    outerCornerVertices.every(
      ({ x, y }) => Math.abs(Math.hypot(x - 2, y) - 0.5) < 1e-9,
    ),
  ).toBe(true)
  expect(vertices.some(({ x, y }) => x === 2.5 && y === 0.5)).toBe(false)
  expect(vertices.some(({ x, y }) => x === 1.5 && y === -0.5)).toBe(true)
})
