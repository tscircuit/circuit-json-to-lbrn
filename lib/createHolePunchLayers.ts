import type { PcbHole, PcbPlatedHole, PcbVia } from "circuit-json"
import type { CutSetting } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { createCirclePath } from "./helpers/circleShape"
import { createLayerShapePath } from "./helpers/createLayerShapePath"

type Layer = "top" | "bottom"

interface HolePunch {
  centerX: number
  centerY: number
}

const PUNCH_MARK_RADIUS_MM = 0.08

const getRequiredCutIndex = (cutSetting: CutSetting): number => {
  if (typeof cutSetting.index !== "number") {
    throw new Error("Hole punch cut setting is missing an index")
  }
  return cutSetting.index
}

const getHolePunchCutSetting = (
  layer: Layer,
  ctx: ConvertContext,
): CutSetting | undefined =>
  layer === "top" ? ctx.topHolePunchCutSetting : ctx.bottomHolePunchCutSetting

const getDiameterFromSize = (width?: number, height?: number) => {
  if (typeof width !== "number" || typeof height !== "number") return undefined
  if (width <= 0 || height <= 0) return undefined
  return Math.min(width, height)
}

const getPcbHolePunch = (
  hole: PcbHole,
  ctx: ConvertContext,
): HolePunch | undefined => {
  const centerX = hole.x + ctx.origin.x
  const centerY = hole.y + ctx.origin.y

  switch (hole.hole_shape) {
    case "circle":
    case "square":
      if (hole.hole_diameter <= 0) return undefined
      return { centerX, centerY }
    case "rect":
    case "oval":
    case "pill":
    case "rotated_pill": {
      const drillDiameter = getDiameterFromSize(
        hole.hole_width,
        hole.hole_height,
      )
      return drillDiameter ? { centerX, centerY } : undefined
    }
    default: {
      const _exhaustive: never = hole
      return _exhaustive
    }
  }
}

const getPlatedHolePunch = (
  hole: PcbPlatedHole,
  ctx: ConvertContext,
): HolePunch | undefined => {
  const centerX = hole.x + ctx.origin.x
  const centerY = hole.y + ctx.origin.y

  switch (hole.shape) {
    case "circle":
      if (hole.hole_diameter <= 0) return undefined
      return { centerX, centerY }
    case "oval":
    case "pill": {
      const drillDiameter = getDiameterFromSize(
        hole.hole_width,
        hole.hole_height,
      )
      return drillDiameter ? { centerX, centerY } : undefined
    }
    case "circular_hole_with_rect_pad":
      if (hole.hole_diameter <= 0) return undefined
      return {
        centerX: centerX + (hole.hole_offset_x ?? 0),
        centerY: centerY + (hole.hole_offset_y ?? 0),
      }
    case "pill_hole_with_rect_pad":
    case "rotated_pill_hole_with_rect_pad": {
      const drillDiameter = getDiameterFromSize(
        hole.hole_width,
        hole.hole_height,
      )
      if (!drillDiameter) return undefined
      return {
        centerX: centerX + hole.hole_offset_x,
        centerY: centerY + hole.hole_offset_y,
      }
    }
    case "hole_with_polygon_pad": {
      const drillDiameter =
        hole.hole_diameter ??
        getDiameterFromSize(hole.hole_width, hole.hole_height)
      if (!drillDiameter || drillDiameter <= 0) return undefined
      return {
        centerX: centerX + hole.hole_offset_x,
        centerY: centerY + hole.hole_offset_y,
      }
    }
    default: {
      const _exhaustive: never = hole
      return _exhaustive
    }
  }
}

const getViaPunch = (
  via: PcbVia,
  ctx: ConvertContext,
): HolePunch | undefined => {
  if (via.hole_diameter <= 0) return undefined
  return {
    centerX: via.x + ctx.origin.x,
    centerY: via.y + ctx.origin.y,
  }
}

const dedupePunches = (punches: HolePunch[]): HolePunch[] => {
  const seen = new Set<string>()
  return punches.filter((punch) => {
    const key = [punch.centerX.toFixed(6), punch.centerY.toFixed(6)].join(",")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const addPunchMark = ({
  punch,
  cutIndex,
  layer,
  ctx,
}: {
  punch: HolePunch
  cutIndex: number
  layer: Layer
  ctx: ConvertContext
}) => {
  const markPath = createCirclePath({
    centerX: punch.centerX,
    centerY: punch.centerY,
    radius: PUNCH_MARK_RADIUS_MM,
    segments: 16,
  })

  ctx.project.children.push(
    createLayerShapePath({
      cutIndex,
      pathData: markPath,
      layer,
      isClosed: true,
      ctx,
    }),
  )
}

export const createHolePunchLayers = (ctx: ConvertContext) => {
  const punches = dedupePunches([
    ...ctx.db.pcb_via
      .list()
      .map((via) => getViaPunch(via, ctx))
      .filter((punch): punch is HolePunch => Boolean(punch)),
    ...ctx.db.pcb_plated_hole
      .list()
      .map((hole) => getPlatedHolePunch(hole, ctx))
      .filter((punch): punch is HolePunch => Boolean(punch)),
    ...ctx.db.pcb_hole
      .list()
      .map((hole) => getPcbHolePunch(hole, ctx))
      .filter((punch): punch is HolePunch => Boolean(punch)),
  ])

  if (punches.length === 0) return

  for (const layer of ctx.includeLayers) {
    const punchCutSetting = getHolePunchCutSetting(layer, ctx)
    if (!punchCutSetting) continue

    const punchCutIndex = getRequiredCutIndex(punchCutSetting)

    for (const punch of punches) {
      addPunchMark({
        punch,
        cutIndex: punchCutIndex,
        layer,
        ctx,
      })
    }
  }
}
