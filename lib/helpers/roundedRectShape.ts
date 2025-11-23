export interface Point {
  x: number
  y: number
}

export interface Prim {
  type: number
}

export interface RoundedRectPath {
  verts: Point[]
  prims: Prim[]
}

export const createRoundedRectPath = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  borderRadius: number = 0,
  segments: number = 4,
  rotation: number = 0,
): RoundedRectPath => {
  const verts: Point[] = []
  const prims: Prim[] = []
  const halfWidth = width / 2
  const halfHeight = height / 2

  const rotatePoint = (x: number, y: number) => {
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    }
  }

  const addPoint = (x: number, y: number) => {
    const rotated = rotation ? rotatePoint(x, y) : { x, y }
    verts.push({ x: centerX + rotated.x, y: centerY + rotated.y })
    prims.push({ type: 0 })
  }

  // Top edge
  addPoint(-halfWidth + borderRadius, -halfHeight)
  addPoint(halfWidth - borderRadius, -halfHeight)

  // Top-right corner
  if (borderRadius > 0) {
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI * 1.5 + (i * Math.PI * 0.5) / segments
      addPoint(
        halfWidth - borderRadius + Math.cos(angle) * borderRadius,
        -halfHeight + borderRadius + Math.sin(angle) * borderRadius,
      )
    }
  } else {
    addPoint(halfWidth, -halfHeight)
  }

  // Right edge
  addPoint(halfWidth, -halfHeight + borderRadius)
  addPoint(halfWidth, halfHeight - borderRadius)

  // Bottom-right corner
  if (borderRadius > 0) {
    for (let i = 0; i <= segments; i++) {
      const angle = (i * Math.PI * 0.5) / segments
      addPoint(
        halfWidth - borderRadius + Math.cos(angle) * borderRadius,
        halfHeight - borderRadius + Math.sin(angle) * borderRadius,
      )
    }
  } else {
    addPoint(halfWidth, halfHeight)
  }

  // Bottom edge
  addPoint(halfWidth - borderRadius, halfHeight)
  addPoint(-halfWidth + borderRadius, halfHeight)

  // Bottom-left corner
  if (borderRadius > 0) {
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI * 0.5 + (i * Math.PI * 0.5) / segments
      addPoint(
        -halfWidth + borderRadius + Math.cos(angle) * borderRadius,
        halfHeight - borderRadius + Math.sin(angle) * borderRadius,
      )
    }
  } else {
    addPoint(-halfWidth, halfHeight)
  }

  // Left edge
  addPoint(-halfWidth, halfHeight - borderRadius)
  addPoint(-halfWidth, -halfHeight + borderRadius)

  // Top-left corner
  if (borderRadius > 0) {
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i * Math.PI * 0.5) / segments
      addPoint(
        -halfWidth + borderRadius + Math.cos(angle) * borderRadius,
        -halfHeight + borderRadius + Math.sin(angle) * borderRadius,
      )
    }
  } else {
    addPoint(-halfWidth, -halfHeight)
  }

  if (verts.length > 0) {
    const firstVert = verts[0]
    if (firstVert) {
      verts.push({ ...firstVert })
      prims.push({ type: 0 })
    }
  }

  return { verts, prims }
}
