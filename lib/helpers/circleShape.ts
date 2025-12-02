export interface Point {
  x: number
  y: number
}

export interface Prim {
  type: number
}

export interface CirclePath {
  verts: Point[]
  prims: Prim[]
}

export interface CreateCirclePathParams {
  centerX: number
  centerY: number
  radius: number
  segments?: number
}

export const createCirclePath = ({
  centerX,
  centerY,
  radius,
  segments = 64,
}: CreateCirclePathParams): CirclePath => {
  const verts: Point[] = []
  const prims: Prim[] = []

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    verts.push({ x, y })
    prims.push({ type: 0 })
  }

  // Close the circle
  if (verts.length > 0) {
    const firstVert = verts[0]
    if (firstVert) {
      verts.push({ ...firstVert })
      prims.push({ type: 0 })
    }
  }

  return { verts, prims }
}
