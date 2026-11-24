import { expect, test } from "bun:test"
import Flatten from "@flatten-js/core"
import { polygonToShapePathDatas } from "../../lib/polygon-to-shape-path"

const ringPolygon = () => {
  const bars = [
    [
      [0, 0],
      [10, 0],
      [10, 2],
      [0, 2],
    ],
    [
      [8, 0],
      [10, 0],
      [10, 10],
      [8, 10],
    ],
    [
      [0, 8],
      [10, 8],
      [10, 10],
      [0, 10],
    ],
    [
      [0, 0],
      [2, 0],
      [2, 10],
      [0, 10],
    ],
  ].map(
    (points) =>
      new Flatten.Polygon(points.map(([x, y]) => Flatten.point(x, y))),
  )
  let ring = bars[0]!
  for (const bar of bars.slice(1)) {
    ring = Flatten.BooleanOperations.unify(ring, bar)
  }
  return ring
}

test("splits each SVG subpath into its own contour", () => {
  const [island] = ringPolygon().splitToIslands()
  const contours = polygonToShapePathDatas(island!)

  // Outer boundary and hole must stay separate contours; merging them into
  // one vertex list inserts a chord that LightBurn cuts across the fill.
  expect(contours).toHaveLength(2)
  for (const contour of contours) {
    expect(contour.verts.length).toBe(contour.prims.length)
  }
})

test("keeps a single subpath as one contour", () => {
  const square = new Flatten.Polygon([
    Flatten.point(0, 0),
    Flatten.point(4, 0),
    Flatten.point(4, 4),
    Flatten.point(0, 4),
  ])
  const contours = polygonToShapePathDatas(square)
  expect(contours).toHaveLength(1)
  expect(contours[0]!.verts).toHaveLength(5)
})
