import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { Polygon } from "@flatten-js/core"
import offsetPolygon from "offset-polygon"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const { netGeoms, connMap } = ctx

  const netId = connMap.getNetConnectedToId(trace.pcb_trace_id)!

  if (!trace.route || trace.route.length < 2) {
    console.warn(`Trace ${trace.pcb_trace_id} has insufficient route points`)
    return
  }

  const traceOutline = offsetPolygon(trace.route, 0.5)

  const polygon = new Polygon(traceOutline.map((point) => [point.x, point.y]))

  netGeoms.get(netId)?.push(polygon)
}
