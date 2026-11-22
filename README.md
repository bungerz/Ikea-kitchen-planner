# CASSIOPÉE Ambilly (Lot 17 · T4) — Full Apartment 3D Studio + GPU Ray Tracing

Interactive full-apartment 3D interior planner modeled to the centimeter from the **CASSIOPÉE — Ambilly, Lot 17 (T4 · 83.4 m² + 11.5 m² Loggia)** architectural plans, **PLAN TMA du 16/06/2026**, **Fiche de Choix des Prestations Intérieures**, and exact **IKEA METOD U-Kitchen** drawings.

## Key Features

- **Exact T4 Architectural Shell (`11.37 m × 11.25 m × 2.50 m`)**:
  - **Chambre 3 (Master Suite)** expanded with former SDE removed (TMA #4), twin north-wall sconces (TMA #2), and Egger *Chêne du Nord Naturel (EL 2970)* oak laminate floor.
  - **Séjour & IKEA METOD U-Kitchen** with the exact 120 cm half-wall (TMA #5), optional oak/walnut/black/white claustra, all 6 IKEA beige-family doors (`BODBYN`, `STENSUND`, `HAVSTORP`, `UPPLÖV`, `VOXTORP`, `HAVSTORP Marron beige`), 12 IKEA France countertops, and Combo A/B Compare (`Space`).
  - **Salle de Bains** with signed full-height *Faïence KEVIN TAUPE (Réf. 4880347)* & *KEVIN DECOR CHAUD MAT (Réf. 4880348)* bathtub surround + white vanity + washing machine.
  - **WC** with toilet, TMA #21 future *lave-mains* hand-wash basin, mirror, and full wall paint customization.
  - **Chambre 1**, **Chambre 2**, **Entrée & Dégagement**, and **Loggia** (`11.5 m²`), with *Grès Cérame Rectifié Effet Béton Taupe 60×60 (Réf. 4880309)* in tiled zones and *Egger Chêne du Nord Naturel* in all three bedrooms.
- **IKEA Queen Size Beds Catalog (160×200 cm only)**: 12 authentic IKEA Queen bed frames (`MALM`, `TUFJORD`, `IDANÄS`, `BJÖRKSNÄS`, `TONSTAD`, `HEMNES`, `NORDLI`, `SLATTUM`, `BRIMNES`, `GLADSTAD`, `SONGESAND`, `SAGSTUA`) selectable per bedroom with real finishes.
- **Dulux Valentine Wall Paint Studio**: Defaults to **Original Promoteur White** across all rooms, with per-room & All-Walls vs Accent-Wall-Only selection across curated *Light Beige / Linen* (Ch. 1 & 2), *Light Taupe* (Ch. 3 Master), and *WC / Statement* shades.
- **IKEA Living Room Sofas**: 8 IKEA France sofa series (`SÖDERHAMN`, `KIVIK`, `VIMLE`, `JÄTTEBO`, `LANDSKRONA`, `STOCKHOLM 2025`, `ÄPPLARYD`, `FRIHETEN`) with reversible chaise & 8 fabrics.
- **Mobili Fiver Extensible Dining Tables (Walnut Default)**: 6 Mobili Fiver models (`EMMA`, `FIRST`, `EVOLUTION`, `EASY`, `ANGELICA` Round→Oval, `RACHELE`) with interactive 3-step extension (`Closed` → `+1 Leaf` → `Full Ext.`) and dynamic chair layout.
- **Effortless 3D Drag & Drop UX**: Click/drag any furniture directly on the floor with 5 cm grid snap (`G`), live cm wall-clearance readouts, `R` / `Shift+R` rotation, `Ctrl+Z` / `Ctrl+Y` undo/redo, cutaway/ceiling toggle, and auto-save (`localStorage` + JSON export).
- **Default TMA Light Fixtures**: Curated pendant, flush, and Chambre 3 sconce families mapped to every TMA DCL point, plus Morning / Daylight D65 / Cozy Evening modes and **On-Demand WebGL2 GPU Path Tracing**.
- **4th-Floor (`R+4`) Résidence Cassiopée & Real Ambilly Sun Simulator**:
  - Exact geolocation (`46.1941° N, 6.2230° E`, **7 rue de la Fraternité, 74100 Ambilly**) and blueprint compass orientation (`Plan Top = NNE 17°`, **Loggia / Ch.1 / Ch.2 = SSW**, **Séjour / Ch.3 = WNW**).
  - Real NOAA solar azimuth & elevation calculator with season selector (`Summer`, `Equinox`, `Autumn`, `Winter`), live time-of-day slider (`05:30 → 22:30`), `▶ Play Day` solar timelapse, and dynamic physical sky dome.
  - 4-story Clément Vergely gridded pale-limestone facade descending to street level (`-11.6 m`), landscaped *Écoquartier de l'Étoile* courtyard & trees, and distant **Mont Salève (SSW)**, **Jura (NW)**, and **Voirons (E)** horizon ridges (toggleable via `R+4 View`).
- **✨ Phase 2 Prompt 3D Studio (The Grail)**:
  - Declarative multi-part 3D CAD schema (`parts[]`) with 12 built-in designer recipes (fluted walnut sideboard, arched brass mirror, curved bouclé chair, designer bookcase, marble coffee table, backlit vanity, kitchen bar stools, arc lamp, wine cabinet, etc.).
  - **Iterative Prompt Editing** on any selected piece (*"make it 30cm wider"*, *"change legs to brass"*, *"switch to walnut"*).
  - **Custom `.GLB / .GLTF` 3D Model Importer** + optional **Live LLM 3D Engine (Gemini 2.5 Flash / OpenAI BYOK)** stored locally in your browser.

## Local Development

```bash
npm install
npm run dev
npm run build
```
