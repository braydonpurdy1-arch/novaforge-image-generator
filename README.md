# NovaForge Image Studios

NovaForge Image Studios is the visual-generation and post-production workflow for NovaForge projects.

## Default still + motion workflow

NovaForge adopts the following non-proprietary production techniques for image and video work:

1. **Reference lock** — preserve user-selected identity, composition, logos, vehicle geometry, typography, or other protected visual elements unless an edit explicitly targets them.
2. **Scene decomposition** — reason about foreground, subject, background, atmosphere, reflections, lighting, particles, and text as separate visual layers.
3. **Still generation/edit** — establish the strongest reference frame before animation.
4. **Motion planning** — specify subject motion, camera motion, environmental motion, and lighting changes independently.
5. **Keyframe/reference-guided animation** — use start/end frames and reference images where supported to reduce uncontrolled drift.
6. **Motion-strength control** — prefer restrained movement for faces, memorial imagery, logos, vehicles, and UI assets; increase motion only where the scene calls for it.
7. **Camera-language prompting** — use deliberate cinematography terms such as dolly, pan, orbit, push-in, pull-back, rack focus, parallax, macro drift, and depth-of-field changes.
8. **Layered animation** — move foreground, subject, atmosphere, reflections, lighting, and background at different rates where appropriate to create believable depth.
9. **Temporal consistency checks** — reject or revise clips with identity drift, face warping, geometry changes, text mutation, flicker, object duplication, or extra limbs.
10. **Negative motion constraints** — explicitly state what must remain fixed or unchanged during generation.
11. **Reference-guided look transfer** — use references for lighting, palette, lens feel, atmosphere, and composition without copying proprietary assets or branding.
12. **Short-shot iteration** — generate controlled short clips first, review them, then extend, interpolate, or stitch only after consistency is acceptable.
13. **Multi-model routing** — treat generation, editing, animation, upscaling, interpolation, and finishing as separate stages so the best available provider can be used for each.
14. **Manual finishing** — Photo Studio PRO can be used as an optional post-processing stage for masks, local corrections, sharpening, tone, colour, compositing, and cleanup.

## Provider policy

No external creative provider is a required runtime dependency. Koi-style motion workflows, Higgsfield, FLUX/Black Forest Labs, Seedream, Kling, Veo, Runway, or other supported services can be treated as interchangeable providers when available.

NovaForge should preserve its own orchestration, reference-lock rules, quality checks, and export pipeline regardless of which provider is used.

## Recommended pipeline

`Reference lock -> Scene decomposition -> Still generation/edit -> Motion plan -> Keyframe/reference-guided animation -> Temporal consistency review -> Enhancement/upscale -> Photo Studio PRO/manual finishing -> Export`

## Nova UI / boot-animation use

The same motion methodology applies to Nova visual assets, including:

- controlled static-electricity motion inside VF lettering
- subtle particle and star fields
- parallax nebula/cosmic backgrounds
- repeatable seamless loops
- restrained camera drift
- protected logo and typography geometry
- motion-safe overlays and readable instrumentation

These techniques are design and production methodology only. They do not grant third-party creative apps access to Nova vehicle data, CAN/OBD interfaces, diagnostics, or driving-critical systems.
