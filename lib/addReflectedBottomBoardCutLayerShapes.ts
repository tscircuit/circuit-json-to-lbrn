import { ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { LAYER_INDEXES } from "./layer-indexes"

const cloneShapePath = (shape: ShapePath, cutIndex: number) =>
  new ShapePath({
    cutIndex,
    verts: shape.verts.map((vert) => ({ ...vert })),
    prims: shape.prims.map((prim) => ({ ...prim })),
    isClosed: shape.isClosed,
    locked: shape.locked,
    xform: shape.xform ? ([...shape.xform] as typeof shape.xform) : undefined,
  })

export const addReflectedBottomBoardCutLayerShapes = (ctx: ConvertContext) => {
  const {
    project,
    throughBoardCutSetting,
    reflectedBottomBoardCutSetting,
    bottomLayerXform,
  } = ctx

  if (!reflectedBottomBoardCutSetting || !bottomLayerXform) return

  const throughBoardShapes = project.children.filter(
    (child): child is ShapePath =>
      child instanceof ShapePath &&
      child.cutIndex === throughBoardCutSetting.index,
  )

  for (const shape of throughBoardShapes) {
    const reflectedShape = cloneShapePath(
      shape,
      LAYER_INDEXES.reflectedBottomBoardCut,
    )
    reflectedShape.xform = [...bottomLayerXform] as typeof reflectedShape.xform
    project.children.push(reflectedShape)
  }
}
