import type { ConvertContext } from "../ConvertContext"

export type PathData = {
  verts: Array<{ x: number; y: number }>
  prims: Array<{ type: number }>
}

export const mirrorPathData = (
  path: PathData,
  ctx: ConvertContext,
): PathData => {
  const centerX = ctx.bottomLayerMirrorCenterX
  if (typeof centerX !== "number") {
    return path
  }

  return {
    verts: path.verts.map((vert) => ({
      x: 2 * centerX - vert.x,
      y: vert.y,
    })),
    prims: path.prims,
  }
}
