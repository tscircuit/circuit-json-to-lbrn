import Flatten from "@flatten-js/core"
const { Polygon } = Flatten
import { ShapePath } from "lbrnts"

/**
 * Convert a flatten-js Polygon to ShapePath vertices and primitives
 */
export function polygonToShapePathData(polygon: Polygon): {
  verts: Array<{ x: number; y: number }>
  prims: Array<{ type: number }>
} {
  const verts: Array<{ x: number; y: number }> = []
  const prims: Array<{ type: number }> = []

  // Try to get faces first (works for regular polygons)
  const faces = Array.from(polygon.faces)

  if (faces.length > 0) {
    // Use face edges (preferred method for regular polygons)
    const firstFace = faces[0]
    const edges = Array.from(firstFace.edges)

    for (const edge of edges) {
      verts.push({
        x: edge.start.x,
        y: edge.start.y,
      })
      // All edges are line segments for now (type 0)
      prims.push({ type: 0 })
    }
  } else {
    // Fallback: extract from polygon edges directly
    // This happens after boolean operations
    const edges = Array.from(polygon.edges)

    if (edges.length === 0) {
      return { verts: [], prims: [] }
    }

    // Build a connected path from edges
    // Start with first edge
    let currentEdge = edges[0]
    verts.push({
      x: currentEdge.start.x,
      y: currentEdge.start.y,
    })
    prims.push({ type: 0 })

    const usedEdges = new Set([currentEdge])
    let currentPoint = currentEdge.end

    // Find connected edges
    while (usedEdges.size < edges.length) {
      const nextEdge = edges.find(
        (e) =>
          !usedEdges.has(e) &&
          (e.start.equalTo(currentPoint) || e.end.equalTo(currentPoint)),
      )

      if (!nextEdge) break

      // Add the point
      const nextPoint = nextEdge.start.equalTo(currentPoint)
        ? nextEdge.start
        : nextEdge.end
      verts.push({
        x: nextPoint.x,
        y: nextPoint.y,
      })
      prims.push({ type: 0 })

      usedEdges.add(nextEdge)
      currentPoint = nextEdge.start.equalTo(currentPoint)
        ? nextEdge.end
        : nextEdge.start
    }
  }

  return { verts, prims }
}

/**
 * Convert a Polygon to a ShapePath for LBRN
 */
export function polygonToShapePath(
  polygon: Polygon,
  cutIndex: number,
): ShapePath {
  const { verts, prims } = polygonToShapePathData(polygon)

  return new ShapePath({
    cutIndex,
    verts,
    prims,
    isClosed: true,
  })
}
