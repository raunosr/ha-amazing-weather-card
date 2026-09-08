# Brand asset

`assets/icon.png` is the project's generated brand mark. It is a repository/README asset, separate from the weather condition symbols in the card. Generated with the built-in image generation tool on 2026-09-07.

HACS currently shows a shared category icon (the package/box) for dashboard cards. It does not read this repository's PNG for that list icon. Its frontend uses brand images for integrations and category icons for other repository types; there is no supported `icon` setting in `hacs.json` for this purpose. See the [HACS icon renderer](https://github.com/hacs/frontend/blob/main/src/dashboards/hacs-dashboard.ts#L312-L332). This does not indicate an installation problem.

Prompt:

> Use case: logo-brand. Create one exceptionally polished app icon for a new open-source Home Assistant dashboard card named Amazing Weather Card. Square 1024x1024 composition. A simple distinctive weather emblem: a flowing mint-green cloud silhouette merging into a gentle weather-history curve, with a warm golden sun peeking above and a single sky-blue rain droplet below. Deep midnight navy rounded-square tile, tiny amount of atmospheric depth, crisp bold shapes and sophisticated restrained gradients. The design must read instantly at 48 pixels and feel calm, premium, friendly, Nordic. Centered emblem with generous clean breathing room, no small details. Flat front-on view, not a mockup in a scene. No letters, text, watermark, Home Assistant logo, border, or extra icons. Fill the square with the navy background; the graphic itself is designed as a rounded-square app badge. This image will be the repository and README brand mark, not the actual weather condition icon.
