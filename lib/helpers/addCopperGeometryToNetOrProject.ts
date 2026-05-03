import type { ConvertContext } from "../ConvertContext"
import { pathToPolygon } from "./pathToPolygon"

const ensureGeometryMapsHaveNet = (ctx: ConvertContext, netId: string) => {
  if (!ctx.topCutNetGeoms.has(netId)) ctx.topCutNetGeoms.set(netId, [])
  if (!ctx.bottomCutNetGeoms.has(netId)) ctx.bottomCutNetGeoms.set(netId, [])
  if (!ctx.topScanNetGeoms.has(netId)) ctx.topScanNetGeoms.set(netId, [])
  if (!ctx.bottomScanNetGeoms.has(netId)) ctx.bottomScanNetGeoms.set(netId, [])
}

export const addCopperGeometryToNetOrProject = ({
  geometryId,
  path,
  layer,
  ctx,
}: {
  geometryId?: string
  path: { verts: { x: number; y: number }[]; prims: Array<{ type: number }> }
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
  const { connMap, topCutNetGeoms, bottomCutNetGeoms, includeLayers } = ctx

  if (!includeLayers.includes(layer)) return

  const fallbackGeometryId =
    geometryId ??
    `${layer}:${path.verts
      .map((vert) => `${vert.x.toFixed(6)},${vert.y.toFixed(6)}`)
      .join(";")}`
  const netId =
    (geometryId ? connMap.getNetConnectedToId(geometryId) : undefined) ??
    `unconnected:${fallbackGeometryId}`
  const netGeoms = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms

  ensureGeometryMapsHaveNet(ctx, netId)
  netGeoms.get(netId)!.push(pathToPolygon(path.verts))
}
