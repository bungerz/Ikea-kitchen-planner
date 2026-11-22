# IKEA METOD — U-Kitchen 3D Studio + On-Demand GPU Ray Tracing

Interactive 3D Scandinavian U-shaped IKEA METOD kitchen visualizer calibrated for beige-family fronts (`BODBYN`, `STENSUND`, `HAVSTORP`, `UPPLÖV`, `VOXTORP`, `HAVSTORP Marron beige`) and 12 IKEA France countertops, now upgraded with **on-demand WebGL2 GPU Path Tracing (Ray Tracing)**.

## Features

- **60fps Realtime 3D Mode (Default)** — Instant startup, zero path-tracing overhead until requested, foldable-safe layout for Galaxy Z Fold (cover & unfolded) and desktop.
- **On-Demand GPU Path Tracing (`Ray Trace`)** — Powered by `three-gpu-pathtracer` + `three-mesh-bvh` (lazy-loaded on click):
  - Multi-bounce global illumination & natural color bleeding between beige doors, pure white walls, oak claustra slats, and flooring.
  - Physically-based reflections on glossy `VOXTORP` fronts, `KASKER` polished quartz, black induction glass, and brushed brass/stainless hardware.
  - Procedural HDR architectural sky/window dome + physical `ShapedAreaLight` under-cabinet LED strips and Scandinavian pendant pools.
  - Adaptive edge-preserving **Smart Denoiser** (`DenoiseMaterial`) for clean renders even at low sample counts.
  - **Auto-detected Hardware Profiles**:
    - **Fold / Fast** (`0.72×` scale, `3×3` tiles, `4` bounces, `64` spp) — tuned for Galaxy Z Fold / mobile GPUs.
    - **Balanced** (`0.90×` scale, `2×2` tiles, `5` bounces, `128` spp) — tablets & laptops.
    - **RTX Ultra** (`1.0×` native DPR, `1×1` full-frame, `8` bounces, `256+` spp) — desktop GPUs like NVIDIA RTX 3070.
  - **Save PNG** snapshot export of converged ray-traced renders.
- **Simultaneous Door + Countertop Combo A/B Compare** (`Space` or floating Swap pill) and **4-Chip Contrast Calibration** strip.

## Local Development

```bash
npm install
npm run dev
npm run build
```
