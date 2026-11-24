import type { Polygon } from "@flatten-js/core"

export interface ShapePathData {
  verts: Array<{ x: number; y: number }>
  prims: Array<{ type: number }>
}

/**
 * Converts a flattenjs Polygon to one verts/prims array per contour for use
 * with ShapePath. A polygon containing a hole serializes to multiple SVG
 * subpaths; each subpath must stay a separate contour or the merged vertex
 * list cuts a chord between the boundary and the hole.
 * @param polygon The flattenjs Polygon to convert
 * @returns One { verts, prims } entry per contour, in SVG subpath order
 */
export function polygonToShapePathDatas(polygon: Polygon): ShapePathData[] {
  const contours: ShapePathData[] = []

  // Get SVG representation and extract path data
  const svgString = polygon.svg()
  const dAttributeMatch = svgString.match(/\bd="([^"]+)"/)

  if (!dAttributeMatch || !dAttributeMatch[1]) {
    return contours
  }

  const pathData = dAttributeMatch[1].trim()

  // Parse SVG path commands (M, L, z); each M starts a new contour
  const commands = pathData.match(/[MLz][^MLz]*/g) || []

  let current: ShapePathData | undefined
  for (const command of commands) {
    const type = command[0]
    const coords = command.slice(1).trim()

    if (type === "M") {
      current = { verts: [], prims: [] }
      contours.push(current)
    }

    if (type === "M" || type === "L") {
      // Parse coordinates (format: "x,y")
      const parts = coords.split(",")
      const x = Number(parts[0])
      const y = Number(parts[1])

      if (!Number.isNaN(x) && !Number.isNaN(y) && current) {
        current.verts.push({ x, y })
        current.prims.push({ type: 0 }) // 0 = LineTo
      }
    }
    // 'z' closes the contour, no action needed
  }

  return contours
}
