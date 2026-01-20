// Lazy-load the manifold WASM module
// Supports both Node.js and browser environments with CDN fallback

let manifoldInstance: any = null

export const getManifold = async () => {
  if (!manifoldInstance) {
    let ManifoldModule: any

    // Try Node.js import first (for CLI/tests)
    try {
      const moduleName = "manifold-3d"
      ManifoldModule = (await import(/* @vite-ignore */ moduleName)).default
    } catch {
      // Fallback to CDN for browser environments
      try {
        const cdnUrl =
          "https://cdn.jsdelivr.net/npm/manifold-3d@3.0.0/manifold.js"
        ManifoldModule = (await import(/* @vite-ignore */ cdnUrl)).default
      } catch (cdnError) {
        throw new Error(
          `Failed to load manifold-3d: not available in Node.js or via CDN. ${cdnError}`,
        )
      }
    }

    manifoldInstance = await ManifoldModule()
    manifoldInstance.setup() // Initialize the JS-friendly API
  }
  return manifoldInstance
}
