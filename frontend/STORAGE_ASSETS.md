# Storage concept product images

These are GT Select mock products for frontend presentation, not actual Samsung/WD/Toshiba/Seagate manufacturer photographs or verified hardware specifications.

- Catalog: `src/mocks/storageModels.json` and `src/mocks/storageCatalog.js`.
- Assets: `public/storefront/storage-v2/{productId}-black.png` and `{productId}-white.png`.
- One unique model design per product, with its own dark rendering and matching light rendering. SSD and HDD each have ten unique thumbnail images.
- Original assets remain unchanged. No external USB drives or portable enclosures are used.
- The same model assets populate cards, cart, gallery, and the composed silver-black story banner. The storage story preserves original PCB/contact/label colors.
- Checks: `npm run check:storage` validates ten products per category, unique model/design names, unique SHA-256 thumbnail contents and model-specific image paths.

## Image generation mode and prompt
Built-in imagegen was used. For each model the generation prompt specified its exact exterior design (PCB, heatsink/case pattern or stamped HDD cover and label), form factor and internal connector. Prompt template:

“Photoreal industrial product photo of ONE unique internal SSD/HDD concept model, three-quarter overhead view, entire correct internal connector visible, transparent alpha background, safe margin, neutral silver studio lighting. Preserve natural PCB/contact/copper/label colors. No USB socket, external portable case, floor, packaging, collage or real manufacturer branding.”

The matching light variant used its dark model image as the edit target:

“Keep exact model geometry, dimensions, chip/fins/stamping layout, holes, connectors, colored labels and camera angle. Change dark exterior metal/heatsink surfaces to satin white or bright silver. Preserve PCB, NAND, gold contacts and copper. No full-image grayscale; actual transparent background.”

Per-model design descriptions are in `src/mocks/storageModels.json` (`visualDesign`). Prices and specs remain temporary mock UI content. Replace them with verified manufacturer data through the service layer after API specifications are approved.
## Styled scene revision (2026-11-06)
- Built-in image_gen edit/compositing mode; reference: each model's existing black product image.
- 40 new opaque portrait lifestyle scenes: 20 model-specific dark/light pairs.
- Final project directory: `public/storefront/storage-scenes/{productId}-{black|white}.png`.
- Full prompts and source image provenance: `STORAGE_SCENE_PROMPTS.json`. The first P5-black uses the same chrome plinth / charcoal glass / silver optical light-trail brief as the remaining SSD shots.
- `src/mocks/storageCatalog.js` supplies these through `lifestyle`. The original `image`, `whiteImage` and `gallery` thumbnails stay unchanged. Product view now includes two additional gallery images and uses the same pair in ProductStoryBanner.
- SSD scenes: chrome studio plinths, optical light trails. HDD scenes: steel architectural blocks, broad orbital reflections. Physical PCB and label colors are preserved.
- `scripts/check-storage.mjs` checks both scenes exist, belong to the same model and do not reuse plain gallery images.
- Admin shell CSS belongs to AdminLayout (`admin-shell.css`), so direct delivery-detail entry no longer depends on loading the dashboard first. `delivery.css` uses neutral black/silver accents.
