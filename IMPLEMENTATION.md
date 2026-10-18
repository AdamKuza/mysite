# Native web revision

User-approved visual direction: Petrine Baroque, blue-green / ivory / muted brass, Адамъ Кузнецовъ. All ornament must be actual HTML/CSS/inline SVG. No raster illustrations, generated images, external resources, or invented biography.

Implementation: semantic HTML; architectural HTML components; CSS columns, flutes, pediments and ornamental borders; hand-coded reusable SVG leaf/scroll symbols, crest, detailed sailing vessel and deterministic city/water linework. One offline index.html assembled from editable sources. No runtime JavaScript or dependencies.

Verification: inspect Firefox 158 desktop and narrow/mobile screenshots; reject raster or external asset references; parse SVG geometry as XML; keep artwork separate from readable HTML text; verify reduced-motion stylesheet and viewport layouts.

## Scroll-book revision

User request: preserve approved native-web Petersburg scene; scroll folds ornaments, ship, and city like paper, then unfolds Moscow with the supplied fact of residence. Copy: Живу въ Москвѣ. Keep offline single HTML, full viewport width, Firefox as primary browser.

Implementation: two semantic scenes in a sticky book stage; deterministic scroll progress drives staggered perspective transforms for decorative layers. Native requestAnimationFrame coalesces writes; passive scroll only marks a frame dirty. No continuous idle loop. A real SVG Moscow panorama (Kremlin walls/towers and stylized cathedral silhouettes) follows the original engraved visual language. All geometry remains editable. Reduced-motion and no-JS show both sections in normal flow.

Verify: real Firefox at start, multiple intermediate scroll positions, Moscow fully open, reverse scroll, narrow screen, reduced motion and disabled script; no external resources, unique SVG IDs, valid SVG XML and supplied copy.

## Pull-cord revision

User replaces scroll-driven navigation with a decorative pull cord. Remove artificial scroll travel and scroll listeners. Use the same native-web paper transition triggered by pointer drag >=42 px, click, Enter or Space; reverse on the next activation. A short drag cancels and must not synthesize a second toggle. Reduced-motion switches instantly; no-JS retains both readable sections. Test actual mouse, touch and keyboard input in Firefox.

## Animated harbor

User asks for flowing Petersburg water and sailing ships. Keep native SVG, Firefox compatibility, both column edges covered, Moscow without water, and pull-cord navigation. Animate internal SVG groups using CSS transforms, preserving outer paper-fold transforms. Routes reset beyond viewport edges, pause during folding/hidden Moscow/offscreen/hidden tab, and disable for reduced motion. Real Firefox tests cover travel directions, loop edges and pause/resume.

## Physical cord and foreground boat revision

User asks for an opaque small boat above the big ship, plus a flexible rope which can be shaken in any direction but navigates only after a downward pull. Implemented position-based rope with 18 distance-constrained segments, gravity, a weighted tassel, inertial release, damped return and sleep. Mouse/touch pointer capture drives the endpoint. Navigation requires downward displacement, predominantly vertical direction and tension; pointer click no longer navigates. Keyboard commands simulate a downward pull. Root shader-free SVG paths remain editable; physics pauses when hidden and suppresses residual inertia for reduced motion.

Firefox validation: desktop/tablet/mobile, actual mouse and touch, side/up/diagonal/tap no-op, deliberate downward pull, keyboard return, rest detection and opaque layer ordering. Visual proof includes a forced overlap of the two ships.

2026-10-18: Added a third New York scene, independent green physics rope, destination-aware paper transitions, perspective-projected SVG Times Square with facade signs and 16 moving vehicles. Traffic pauses outside the active scene, on hidden tabs and with reduced motion. Existing Moscow rope and ship layering retained. Browser QA covers mouse/touch, both destinations, return trips, inactive scene inert state and biography clearance.

2026-10-18: Replaced the perspective New York model with a flat engraved facade panorama, a stepped One Times Square silhouette, theatre marquees and two horizontal traffic lanes. Kept independent cord physics and motion pausing. The historical Cyrillic spelling Нью-Іоркъ is attested in Sytin's Military Encyclopedia.

2026-10-18: Rebuilt New York as a street perspective with a pointed central tower separating two avenues. Removed all SVG text and logos. Four vehicle routes use projective position, orientation and scale; cars follow road lanes. Combined thousands of window polygons into per-facade paths to reduce DOM and markup. Kept motion pausing, cord physics and text clearance.

2026-10-18: Rebuilt the scene from the approved photograph by D. Hałas (Times Square 1, southward view from West 45th Street). Replaced the central wedge with a narrow frontal tower and stacked unlettered screens. Surrounding buildings have distinct asymmetric shapes and proportions, including the left curved screen and right masonry facade. Traffic follows unequal street mouths around a pedestrian foreground. All art remains inline SVG.

2026-10-18: Replaced Times Square entirely with an engraved Statue of Liberty, pedestal, island and harbor. Used a sanitized CC0 full-height contour by Bea.miau and added vector detail. Removed traffic markup, keyframes and runtime controller from the standalone build. Navigation, independent ropes and biography retained. Browser checks now assert the monument and absence of removed content.
