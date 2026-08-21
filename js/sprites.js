/* ============================================================
   sprites.js
   Preloads every procedurally-generated pixel-art/tile image used
   across both modes (see tools/gen_dave_sprites.py and
   tools/gen_arcade_assets.py). All local files — zero network
   dependency, the game stays fully self-contained.

   Story Mode (retro, chunky, low-color — the "Dangerous Dave" look):
     davePlayer      -- img/dave-player.png   (1x6: idle/run1/run2/jump/climb1/climb2)
     daveGuard       -- img/dave-guard.png    (1x2: walk1/walk2)
     platformTiles   -- img/platform-tiles.png (1x6: ground/ladder/trophy/door-closed/door-open/wall-deco)

   Arcade Mission (detailed, higher-fidelity "more graphics" look):
     arcadeHero      -- img/guardian-detailed.png (4x4: down/left/right/up x 4 frames)
     arcadeTileset   -- img/arcade-tileset.png (1x10 detailed environment props)

   Floor 5 boss "The Auditor" (see guards.js's Boss class,
   tools/gen_villain_boss_sprite.py):
     bossFace         -- img/boss-face.png (pixelated portrait, active)
     bossFaceDefeated -- img/boss-face-defeated.png (desaturated, after 3 hits)

   FPS Floor 10 boss "The Sentinel" (see fps.js's FpsBoss class,
   tools/gen_villain_boss_sprite.py):
     sentinelGuard    -- img/sentinel-guard.png (1x2 walk-cycle, same
                          56x80/frame geometry as daveGuard)
   ============================================================ */

function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

window.SPRITES = {
  davePlayer: loadImg("img/dave-player.png"),
  daveGuard: loadImg("img/dave-guard.png"),
  platformTiles: loadImg("img/platform-tiles.png"),
  arcadeHero: loadImg("img/guardian-detailed.png"),
  arcadeTileset: loadImg("img/arcade-tileset.png"),
  bossFace: loadImg("img/boss-face.png"),
  bossFaceDefeated: loadImg("img/boss-face-defeated.png"),
  sentinelGuard: loadImg("img/sentinel-guard.png"),
};

/** Frame layout for the Arcade hero sheet (top-down 4-direction walk cycle). */
window.SPRITE_ROWS = ["down", "left", "right", "up"];
window.SPRITE_COLS = 4;

/** Column indices into platform-tiles.png. */
window.PLATFORM_TILE_INDEX = { ground: 0, ladder: 1, trophy: 2, doorClosed: 3, doorOpen: 4, wallDeco: 5 };

/** Column indices into arcade-tileset.png. */
window.ARCADE_TILE_INDEX = {
  tree: 0, buildingWall: 1, turnstile: 2, cubicle: 3, serverRack: 4,
  monitor: 5, beam: 6, floorTech: 7, pathway: 8, rackGoal: 9,
};
