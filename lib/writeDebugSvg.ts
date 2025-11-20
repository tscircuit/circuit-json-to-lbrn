import { Polygon } from "@flatten-js/core"

export const writeDebugSvg = (netName: string, polygon: Polygon) => {
  // Calculate bounds from all points in the polygon
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const face of polygon.faces) {
    for (const edge of face.edges) {
      const start = edge.start
      const end = edge.end

      minX = Math.min(minX, start.x, end.x)
      minY = Math.min(minY, start.y, end.y)
      maxX = Math.max(maxX, start.x, end.x)
      maxY = Math.max(maxY, start.y, end.y)
    }
  }

  // Calculate bounds with 15% margin
  const width = maxX - minX
  const height = maxY - minY
  const margin = 0.15

  const viewBoxX = minX - width * margin
  const viewBoxY = minY - height * margin
  const viewBoxWidth = width * (1 + 2 * margin)
  const viewBoxHeight = height * (1 + 2 * margin)

  // Calculate stroke width as 0.5% of max viewBox dimension
  const maxDimension = Math.max(viewBoxWidth, viewBoxHeight)
  const strokeWidth = maxDimension * 0.001

  const svgContent = `<svg width="800" height="800" style="background-color: #ffffff;" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">
  <g stroke-width="${strokeWidth}">
${polygon.svg()}
  </g>
</svg>`

  Bun.write(`debug-output/${netName}.svg`, svgContent)
}
