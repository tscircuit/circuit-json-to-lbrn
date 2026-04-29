import type { ConvertContext } from "./ConvertContext"
import { createLayerShapePath } from "./helpers/createLayerShapePath"

/**
 * Creates an oxidation cleaning layer for a given layer.
 *
 * This adds the board outline path to the oxidation cleaning layer.
 *
 * The algorithm:
 * 1. Use the board outline contour if present
 * 2. Fall back to rectangular board bounds
 * 3. Create a single closed outline path on the oxidation cleaning layer
 */
export const createOxidationCleaningLayerForLayer = async ({
  layer,
  ctx,
}: {
  layer: "top" | "bottom"
  ctx: ConvertContext
}): Promise<void> => {
  const { project, boardBounds, boardOutlineContour } = ctx

  // Get the appropriate cut setting for this layer
  const cutSetting =
    layer === "top"
      ? ctx.topOxidationCleaningCutSetting
      : ctx.bottomOxidationCleaningCutSetting

  if (!cutSetting) {
    return
  }

  const verts = boardOutlineContour?.length
    ? boardOutlineContour.map(([x, y]) => ({ x, y }))
    : boardBounds
      ? [
          { x: boardBounds.minX, y: boardBounds.minY },
          { x: boardBounds.maxX, y: boardBounds.minY },
          { x: boardBounds.maxX, y: boardBounds.maxY },
          { x: boardBounds.minX, y: boardBounds.maxY },
        ]
      : undefined

  if (!verts || verts.length < 3) {
    console.warn(
      `Cannot create oxidation cleaning layer for ${layer}: no board outline available`,
    )
    return
  }

  if (verts.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    console.warn(
      `Cannot create oxidation cleaning layer for ${layer}: invalid board outline bounds`,
    )
    return
  }

  const firstVert = verts[0]
  const lastVert = verts[verts.length - 1]
  if (
    firstVert &&
    lastVert &&
    (firstVert.x !== lastVert.x || firstVert.y !== lastVert.y)
  ) {
    verts.push({ ...firstVert })
  }

  project.children.push(
    createLayerShapePath({
      cutIndex: cutSetting.index,
      pathData: {
        verts,
        prims: verts.map(() => ({ type: 0 })),
      },
      layer,
      isClosed: true,
      ctx,
    }),
  )
}
