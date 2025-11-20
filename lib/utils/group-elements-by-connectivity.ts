import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type {
  PcbSmtPad,
  PcbTrace,
  PcbPlatedHole,
  AnyCircuitElement,
} from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

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
 * Uses circuit-json-to-connectivity-map to determine connectivity.
 * Elements without connectivity information are returned separately.
 */
export function groupElementsByConnectivity(
  db: CircuitJsonUtilObjects,
): GroupedElements {
  // Convert db to circuit JSON array
  const circuitJson: AnyCircuitElement[] = db.toArray()

  // Get connectivity map from circuit JSON
  const connectivityMap = getFullConnectivityMapFromCircuitJson(circuitJson)

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

  // Group SMT pads using connectivity map
  for (const pad of db.pcb_smtpad.list()) {
    // Get connectivity key, or use the element's ID as a default key
    const connKey =
      connectivityMap.getNetConnectedToId(pad.pcb_smtpad_id) || pad.pcb_smtpad_id

    const netGroup = getOrCreateNetGroup(connKey)
    netGroup.pads.push(pad)
  }

  // Group plated holes using connectivity map
  for (const hole of db.pcb_plated_hole.list()) {
    // Get connectivity key, or use the element's ID as a default key
    const connKey =
      connectivityMap.getNetConnectedToId(hole.pcb_plated_hole_id) ||
      hole.pcb_plated_hole_id

    const netGroup = getOrCreateNetGroup(connKey)
    netGroup.platedHoles.push(hole)
  }

  // Group traces using connectivity map
  for (const trace of db.pcb_trace.list()) {
    // Get connectivity key, or use the element's ID as a default key
    const connKey =
      connectivityMap.getNetConnectedToId(trace.pcb_trace_id) || trace.pcb_trace_id

    const netGroup = getOrCreateNetGroup(connKey)
    netGroup.traces.push(trace)
  }

  return {
    netGroups: Array.from(netGroupMap.values()),
    unconnectedPads: [],
    unconnectedTraces: [],
    unconnectedPlatedHoles: [],
  }
}
