export interface PathPoint {
  x: number
  y: number
}

export interface PathPrim {
  type: number
}

export interface PointAdderOptions {
  rotation?: number
  rotationCenter?: PathPoint
  translation?: PathPoint
}

export const createPointAdder = (
  verts: PathPoint[],
  prims: PathPrim[],
  options: PointAdderOptions = {},
): ((x: number, y: number) => void) => {
  const { rotation = 0, rotationCenter, translation } = options
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const effectiveCenter = rotationCenter ?? translation ?? { x: 0, y: 0 }

  return (x: number, y: number) => {
    let px = x
    let py = y

    if (rotation) {
      const cx = effectiveCenter.x
      const cy = effectiveCenter.y
      const dx = px - cx
      const dy = py - cy
      px = cx + dx * cos - dy * sin
      py = cy + dx * sin + dy * cos
    }

    const tx = translation?.x ?? 0
    const ty = translation?.y ?? 0

    verts.push({ x: px + tx, y: py + ty })
    prims.push({ type: 0 })
  }
}
