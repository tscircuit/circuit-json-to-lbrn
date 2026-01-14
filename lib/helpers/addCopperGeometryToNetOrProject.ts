import type { ConvertContext } from "../ConvertContext"
import { ShapePath } from "lbrnts"
import { pathToPolygon } from "./pathToPolygon"

export const addCopperGeometryToNetOrProject = ({
  geometryId,
  path,
  layer,
  ctx,
}: {
  geometryId: string
  path: { verts: { x: number; y: number }[]; prims: Array<{ type: number }> }
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
  const {
    project,
    connMap,
    topCutNetGeoms,
    bottomCutNetGeoms,
    topCopperCutSetting,
    bottomCopperCutSetting,
    includeLayers,
  } = ctx

  if (!includeLayers.includes(layer)) return

  const netId = connMap.getNetConnectedToId(geometryId)
  const cutSetting =
    layer === "top" ? topCopperCutSetting : bottomCopperCutSetting
  const netGeoms = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms

  if (netId) {
    // Add to netGeoms for union with other elements on same net
    const polygon = pathToPolygon(path.verts)
    netGeoms.get(netId)?.push(polygon)
  } else {
    // No net connection - draw directly to project
    project.children.push(
      new ShapePath({
        cutIndex: cutSetting.index,
        verts: path.verts,
        prims: path.prims,
        isClosed: true,
      }),
    )
  }
}
