export interface Point {
  x: number
  y: number
}

export interface Prim {
  type: number
}

export interface OvalPath {
  verts: Point[]
  prims: Prim[]
}

export const createOvalPath = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number = 0,
  segments: number = 64,
): OvalPath => {
  const verts: Point[] = []
  const prims: Prim[] = []
  const radiusX = width / 2
  const radiusY = height / 2
  const cosTheta = Math.cos(rotation)
  const sinTheta = Math.sin(rotation)

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const localX = radiusX * Math.cos(angle)
    const localY = radiusY * Math.sin(angle)
    const rotatedX = centerX + localX * cosTheta - localY * sinTheta
    const rotatedY = centerY + localX * sinTheta + localY * cosTheta

    verts.push({ x: rotatedX, y: rotatedY })
    prims.push({ type: 0 })
  }

  // Close the oval
  if (verts.length > 0) {
    const firstVert = verts[0]
    if (firstVert) {
      verts.push({ ...firstVert })
      prims.push({ type: 0 })
    }
  }

  return { verts, prims }
}
