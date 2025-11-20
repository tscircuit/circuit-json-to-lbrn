import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { Polygon, Segment, segment, point } from "@flatten-js/core"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const { netGeoms, connMap } = ctx

  const netId = connMap.getNetConnectedToId(trace.pcb_trace_id)!

  if (!trace.route || trace.route.length < 2) {
    console.warn(`Trace ${trace.pcb_trace_id} has insufficient route points`)
    return
  }

  // netGeoms.get(netId)?.push(polygon)
}
