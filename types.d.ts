declare module "*.circuit.json" {
  const content: any
  export default content
}

declare module "*.kicad_pcb" {
  const content: string
  export default content
}
