export interface Point {
  x: number
  y: number
}

export interface Prim {
  type: number
}

export interface PolygonPath {
  verts: Point[]
  prims: Prim[]
}

export const createPolygonPathFromOutline = (
  outline: Array<{ x?: number | null; y?: number | null }>,
  offsetX: number,
  offsetY: number,
): PolygonPath => {
  const verts: Point[] = []

  for (const point of outline) {
    const x = (point.x ?? 0) + offsetX
    const y = (point.y ?? 0) + offsetY
    verts.push({ x, y })
  }

  if (verts.length === 0) {
    return { verts, prims: [] }
  }

  const first = verts[0]!
  verts.push({ x: first.x, y: first.y })

  const prims: Prim[] = new Array(verts.length).fill({ type: 0 })

  return { verts, prims }
}
