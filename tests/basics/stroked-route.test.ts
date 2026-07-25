import { expect, test } from "bun:test"
import { createStrokedRoutePaths } from "../../lib/helpers/create-stroked-route-paths"
import { createStrokedSegmentPath } from "../../lib/helpers/create-stroked-segment-path"

test("closes a rotated pill without adding an interior chord", () => {
  const path = createStrokedSegmentPath({
    start: { x: -1, y: -1 },
    end: { x: 1, y: 1 },
    strokeWidth: 0.5,
    origin: { x: 0, y: 0 },
  })

  expect(path).not.toBeNull()
  expect(path?.verts.at(-1)).toEqual(path?.verts[0])
})

test("unifies connected segment pills into one route outline", () => {
  const paths = createStrokedRoutePaths({
    route: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ],
    strokeWidth: 0.5,
    origin: { x: 0, y: 0 },
  })

  expect(paths).toHaveLength(1)
})
