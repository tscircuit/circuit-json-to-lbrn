import type { PcbPlatedHole } from "circuit-json"
import type { ConvertContext } from "../ConvertContext"
import { CutSetting, ShapePath } from "lbrnts"

export const addPlatedHole = (
  platedHole: PcbPlatedHole,
  ctx: ConvertContext,
) => {
  const { project, copperCutSetting } = ctx

  project.children.push(
    new ShapePath({
      cutIndex: copperCutSetting.index,
    }),
  )

  // TODO add plated hole to lightburn project
}
