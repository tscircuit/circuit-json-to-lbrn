import { ShapePath, type ShapePathInit } from "lbrnts"
import type { ConvertContext } from "../ConvertContext"

type LayerPathData = {
  verts: NonNullable<ShapePathInit["verts"]>
  prims: NonNullable<ShapePathInit["prims"]>
}

export const createLayerShapePath = ({
  pathData,
  layer,
  ctx,
  ...shapeInit
}: Omit<ShapePathInit, "verts" | "prims" | "xform"> & {
  pathData: LayerPathData
  layer: "top" | "bottom"
  ctx: ConvertContext
}) =>
  new ShapePath({
    ...shapeInit,
    verts: pathData.verts,
    prims: pathData.prims,
    xform: layer === "bottom" ? ctx.bottomLayerXform : undefined,
  })
