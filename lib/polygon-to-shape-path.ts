import type { Polygon } from "@flatten-js/core"

export interface ShapePathData {
  verts: Array<{ x: number; y: number }>
  prims: Array<{ type: number }>
}

/**
 * Converts a flattenjs Polygon to verts and prims arrays for use with ShapePath
 * @param polygon The flattenjs Polygon to convert
 * @returns Object containing verts and prims arrays
 */
export function polygonToShapePathData(polygon: Polygon): ShapePathData {
  const verts: Array<{ x: number; y: number }> = []
  const prims: Array<{ type: number }> = []

  // Iterate through all faces (first face is outer boundary, rest are holes)
  for (const face of polygon.faces) {
    const faceStartIdx = verts.length

    // Add vertices from each edge in the face
    for (const edge of face.edges) {
      verts.push({
        x: edge.start.x,
        y: edge.start.y,
      })
    }

    // Create LineTo primitives (type 0) for each edge
    const faceVertCount = verts.length - faceStartIdx
    for (let i = 0; i < faceVertCount; i++) {
      prims.push({ type: 0 }) // 0 = LineTo
    }
  }

  return { verts, prims }
}
