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

  // Get SVG representation and extract path data
  const svgString = polygon.svg()
  const dAttributeMatch = svgString.match(/\bd="([^"]+)"/)

  if (!dAttributeMatch || !dAttributeMatch[1]) {
    return { verts, prims }
  }

  const pathData = dAttributeMatch[1].trim()

  // Parse SVG path commands (M, L, z)
  const commands = pathData.match(/[MLz][^MLz]*/g) || []

  for (const command of commands) {
    const type = command[0]
    const coords = command.slice(1).trim()

    if (type === "M" || type === "L") {
      // Parse coordinates (format: "x,y")
      const parts = coords.split(",")
      const x = Number(parts[0])
      const y = Number(parts[1])

      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        verts.push({ x, y })
        prims.push({ type: 0 }) // 0 = LineTo
      }
    }
    // 'z' closes the path, no action needed
  }

  return { verts, prims }
}
