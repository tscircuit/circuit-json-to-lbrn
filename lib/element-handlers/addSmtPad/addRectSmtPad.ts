import { Box } from "@flatten-js/core"
import type { ConvertContext } from "../../ConvertContext"
import type { PcbSmtPadRect } from "circuit-json"
import { ShapePath } from "lbrnts"

export const addRectSmtPad = (smtPad: PcbSmtPadRect, ctx: ConvertContext) => {
  const { project, copperCutSetting, connMap, netGeoms, origin } = ctx

  const centerX = smtPad.x + origin.x
  const centerY = smtPad.y + origin.y
  const halfWidth = smtPad.width / 2
  const halfHeight = smtPad.height / 2

  const netId = connMap.getNetConnectedToId(smtPad.pcb_smtpad_id)!

  ctx.netGeoms
    .get(netId)
    ?.push(
      new Box(
        centerX - halfWidth,
        centerY - halfHeight,
        centerX + halfWidth,
        centerY + halfHeight,
      ),
    )
}
