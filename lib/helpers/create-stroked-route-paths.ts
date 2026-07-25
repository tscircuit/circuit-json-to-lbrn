import { BooleanOperations, Point, Polygon } from "@flatten-js/core"
import { polygonToShapePathData } from "../polygon-to-shape-path"
import {
  createStrokedSegmentPath,
  type CreateStrokedSegmentPathParams,
} from "./create-stroked-segment-path"
import type { PillPath } from "./pillShape"

interface CreateStrokedRoutePathsParams {
  route: CreateStrokedSegmentPathParams["start"][]
  strokeWidth: number
  origin: CreateStrokedSegmentPathParams["origin"]
}

const createPolygon = (path: PillPath): Polygon =>
  new Polygon(path.verts.map(({ x, y }) => new Point(x, y)))

export const createStrokedRoutePaths = ({
  route,
  strokeWidth,
  origin,
}: CreateStrokedRoutePathsParams): PillPath[] => {
  const segmentPaths: PillPath[] = []

  for (let index = 0; index < route.length - 1; index += 1) {
    const segmentPath = createStrokedSegmentPath({
      start: route[index]!,
      end: route[index + 1]!,
      strokeWidth,
      origin,
    })
    if (segmentPath) segmentPaths.push(segmentPath)
  }

  if (segmentPaths.length <= 1) return segmentPaths

  let routePolygon = createPolygon(segmentPaths[0]!)
  for (const segmentPath of segmentPaths.slice(1)) {
    routePolygon = BooleanOperations.unify(
      routePolygon,
      createPolygon(segmentPath),
    )
  }

  return routePolygon
    .splitToIslands()
    .map(polygonToShapePathData)
    .filter(({ verts }) => verts.length > 0)
}
