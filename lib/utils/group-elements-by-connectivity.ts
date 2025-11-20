import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type {
  PcbSmtPad,
  PcbTrace,
  PcbPlatedHole,
  AnyCircuitElement,
} from "circuit-json"

export interface NetGroup {
  connectivityKey: string
  pads: PcbSmtPad[]
  traces: PcbTrace[]
  platedHoles: PcbPlatedHole[]
}

export interface GroupedElements {
  netGroups: NetGroup[]
  unconnectedPads: PcbSmtPad[]
  unconnectedTraces: PcbTrace[]
  unconnectedPlatedHoles: PcbPlatedHole[]
}

/**
 * Groups circuit elements by their connectivity (net).
 * Elements with the same subcircuit_connectivity_map_key are grouped together.
 * Elements without connectivity information are returned separately.
 */
export function groupElementsByConnectivity(
  db: CircuitJsonUtilObjects,
): GroupedElements {
  // Build mapping: pcb_port_id -> subcircuit_connectivity_map_key
  const portIdToConnectivityKey = new Map<string, string>()

  for (const pcbPort of db.pcb_port.list()) {
    const sourcePort = db.source_port.get(pcbPort.source_port_id)
    if (sourcePort?.subcircuit_connectivity_map_key) {
      portIdToConnectivityKey.set(
        pcbPort.pcb_port_id,
        sourcePort.subcircuit_connectivity_map_key,
      )
    }
  }

  // Build spatial index of pad positions to connectivity keys
  // This helps us determine which net a trace belongs to
  interface PositionKey {
    x: number
    y: number
    layer: string
  }
  const positionToConnectivityKey = new Map<string, string>()

  const makePositionKey = (x: number, y: number, layer: string): string => {
    // Round to avoid floating point precision issues
    const roundedX = Math.round(x * 1000) / 1000
    const roundedY = Math.round(y * 1000) / 1000
    return `${roundedX},${roundedY},${layer}`
  }

  // Map to store elements by connectivity key
  const netGroupMap = new Map<string, NetGroup>()

  // Helper to get or create net group
  const getOrCreateNetGroup = (connKey: string): NetGroup => {
    if (!netGroupMap.has(connKey)) {
      netGroupMap.set(connKey, {
        connectivityKey: connKey,
        pads: [],
        traces: [],
        platedHoles: [],
      })
    }
    return netGroupMap.get(connKey)!
  }

  // Group SMT pads
  const unconnectedPads: PcbSmtPad[] = []
  for (const pad of db.pcb_smtpad.list()) {
    const connKey = pad.pcb_port_id
      ? portIdToConnectivityKey.get(pad.pcb_port_id)
      : undefined

    if (connKey) {
      const netGroup = getOrCreateNetGroup(connKey)
      netGroup.pads.push(pad)
      // Add pad position to spatial index
      const posKey = makePositionKey(pad.x, pad.y, pad.layer)
      positionToConnectivityKey.set(posKey, connKey)
    } else {
      unconnectedPads.push(pad)
    }
  }

  // Group plated holes
  const unconnectedPlatedHoles: PcbPlatedHole[] = []
  for (const hole of db.pcb_plated_hole.list()) {
    const connKey = hole.pcb_port_id
      ? portIdToConnectivityKey.get(hole.pcb_port_id)
      : undefined

    if (connKey) {
      const netGroup = getOrCreateNetGroup(connKey)
      netGroup.platedHoles.push(hole)
      // Add hole position to spatial index for both layers
      for (const layer of ["top", "bottom"]) {
        const posKey = makePositionKey(hole.x, hole.y, layer)
        positionToConnectivityKey.set(posKey, connKey)
      }
    } else {
      unconnectedPlatedHoles.push(hole)
    }
  }

  // Group traces by determining which net they connect to
  // We look at the start and end points and find matching pad positions
  const unconnectedTraces: PcbTrace[] = []
  for (const trace of db.pcb_trace.list()) {
    if (trace.route.length < 2) {
      unconnectedTraces.push(trace)
      continue
    }

    // Check start and end points
    const startPoint = trace.route[0]
    const endPoint = trace.route[trace.route.length - 1]

    const startPosKey = makePositionKey(
      startPoint.x,
      startPoint.y,
      startPoint.layer,
    )
    const endPosKey = makePositionKey(endPoint.x, endPoint.y, endPoint.layer)

    const startConnKey = positionToConnectivityKey.get(startPosKey)
    const endConnKey = positionToConnectivityKey.get(endPosKey)

    // Trace should connect pads with the same connectivity key
    const connKey = startConnKey || endConnKey
    if (connKey && startConnKey === endConnKey) {
      const netGroup = getOrCreateNetGroup(connKey)
      netGroup.traces.push(trace)
    } else {
      // Trace doesn't connect to known pads or connects different nets (error case)
      unconnectedTraces.push(trace)
    }
  }

  return {
    netGroups: Array.from(netGroupMap.values()),
    unconnectedPads,
    unconnectedTraces,
    unconnectedPlatedHoles,
  }
}
