/*
 * The 3D kit for the voice games (three.js, named imports only; load it lazily —
 * `import('…/games/three')` or the single module you need — so three.js stays
 * out of every other page).
 *
 *   stage.js        createStage(canvas, opts): renderer + scene, DPR cap, ResizeObserver, auto quality
 *                   (FPS < minFps → shadows off → lower DPR), context loss (2nd loss → onFallback),
 *                   full dispose, stage.stats { fps, calls, triangles, quality }
 *   environment.js  Environment: sky gradient + sun / moon + stars + clouds, fog, hemisphere + sun
 *                   light; presets day · sunset · night · rain · snow · desert · studio, blended per frame
 *   camera.js       ChaseCamera: springy follow behind a target, lean, shake, FOV kick; portrait /
 *                   landscape framings blended by aspect ratio
 *   studio.js       createStudio(canvas): a car on a turntable (drag, inertia), snapshot() thumbnails
 *   carModels.js    buildCarModel(id): five procedural cars (klassik, sedan, van, jip, sport)
 *   carRig.js       CarFactory / CarRig: a car in a scene — paint, spinning wheels, lamps, brake
 *                   lights, body roll, rims (steel / chrome / gold), neon underglow, exhaust flames
 *   carShapes.js    side-profile extrusion helpers (outlines with wheel arches, panels, warps)
 *   materials.js    paint (clear coat), glass, chrome, gold, rubber, vertex-coloured trim, lamps, glow
 *   primitives.js   ModelBuilder: merged vertex-coloured props (box, cyl, blob, rock, beam, tris)
 *   instancing.js   InstancedBatch (refilled each frame), atlas cells, metric UVs, colorOf(css) (parsed once)
 *   facade.js       instanced city buildings with windows in metres, lit at night
 *   textures.js     canvas textures: plates, word atlas (billboards), windows, soft blobs, noise
 *   weather.js      rain streaks and snow flakes riding with the camera
 *   pool.js         Pool / KeyedPool: no allocation while playing
 *   random.js       seeded(seed), hash(n): the same slot always builds the same world
 */
export { createStage, disposeObject, disposeMaterial } from './stage'
export { Environment, ENV_PRESETS } from './environment'
export { ChaseCamera } from './camera'
export { createStudio } from './studio'
export { buildCarModel, CAR_IDS } from './carModels'
export { CarFactory, CarRig } from './carRig'
export { InstancedBatch, atlasCellMaterial, colorOf, metricUvMaterial } from './instancing'
export { ModelBuilder, lumpy } from './primitives'
export { facadeMaterial, facadeTextures, unitBoxOnGround } from './facade'
export { Weather } from './weather'
export { Pool, KeyedPool } from './pool'
export { seeded, hash } from './random'
export * from './materials'
export * from './textures'
