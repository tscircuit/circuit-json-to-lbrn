export interface Point {
  x: number
  y: number
}

export interface Prim {
  type: number
}

export interface PillPath {
  verts: Point[]
  prims: Prim[]
}

export const createPillPath = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number = 0,
  segments: number = 32,
): PillPath => {
  const verts: Point[] = []
  const prims: Prim[] = []
  const halfWidth = width / 2
  const halfHeight = height / 2
  const radius = Math.min(halfWidth, halfHeight)
  const isVertical = height > width

  // Helper function to rotate a point around the center
  const rotatePoint = (x: number, y: number, angle: number): Point => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const dx = x - centerX
    const dy = y - centerY
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    }
  }

  const addPoint = (x: number, y: number) => {
    const rotated = rotation ? rotatePoint(x, y, rotation) : { x, y }
    verts.push(rotated)
    prims.push({ type: 0 })
  }

  if (isVertical) {
    // Vertical pill (height > width): semicircles on top & bottom
    const capOffset = halfHeight - radius

    // Top semicircle (left to right)
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i / segments) * Math.PI
      const x = centerX + radius * Math.cos(angle)
      const y = centerY - capOffset + radius * Math.sin(angle)
      addPoint(x, y)
    }

    // Right edge connecting top to bottom
    addPoint(centerX + radius, centerY + capOffset)

    // Bottom semicircle (right to left)
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + capOffset + radius * Math.sin(angle)
      addPoint(x, y)
    }

    // Left edge back to top
    addPoint(centerX - radius, centerY - capOffset)
  } else {
    // Horizontal pill (width >= height): semicircles on left & right
    const capOffset = halfWidth - radius

    // Right semicircle (top to bottom)
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i / segments) * Math.PI
      const x = centerX + capOffset + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      addPoint(x, y)
    }

    // Bottom edge
    addPoint(centerX - capOffset, centerY + radius)

    // Left semicircle (bottom to top)
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI / 2 + (i / segments) * Math.PI
      const x = centerX - capOffset + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      addPoint(x, y)
    }

    // Top edge
    addPoint(centerX + capOffset, centerY - radius)
  }

  // Close the path
  if (verts.length > 0) {
    const firstVert = verts[0]
    if (firstVert) {
      verts.push({ ...firstVert })
      prims.push({ type: 0 })
    }
  }

  return { verts, prims }
}
