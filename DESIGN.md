# Design

## World

**Lembar spesifikasi.** The app reads like a technical spec sheet or an architect's drafting sheet: a framed paper document, a rigid modular grid, 1px section rules, content held in thin-bordered cells, small crop marks at the corners, and mono technical annotations. The serif voice, green/gold palette, sharp corners, and Lentera line etching stay; the ornament sits under a blurred veil so it is visible texture, never a surface over text.

Pinned by the owner (Oktober 2026): spec-sheet / blueprint layout, rigid modular grid, 1px section separators, everything framed inside a sheet, small corner crop marks, thin-bordered cells, mono annotations, compact editorial feel, keep the palette, keep the SVG pattern visible under Gaussian blur, light theme only, Lentera as a line etching. Do **not** recreate a scrollbar or a fixed right-edge ruler.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--frame` | `#e6eee3` | Page behind the sheet, masthead strip |
| `--surface` | `#fcfdf9` | Paper |
| `--raised` | `#f2f7ef` | Inset panels, hover |
| `--border` | `#dbe4d7` | Paper edge, quiet borders |
| `--rule` | `#d3ddcd` | Row rules, cell divisions |
| `--rule-strong` | `#21352a` | Section rules, table brackets, masthead, sheet frame |
| `--text` | `#14231a` | Ink |
| `--muted` | `#4f6155` | Secondary copy |
| `--faint` | `#56685c` | Captions, notes |
| `--accent` / `--accent-strong` | `#1c6a43` / `#104d2f` | Primary action, active index, selected option |
| `--accent-soft` | `#dfeee2` | Selected rows, answers |
| `--gold` / `--gold-strong` | `#8a6214` / `#6f4d0d` | Mascot, numerals, links in captions |
| `--gold-soft` / `--gold-line` | `#f5e9c9` / `#c9a24b` | Active score band, explanation rule, focus |
| `--negative` | `#a9271f` | Wrong answer |

No gradients. No second accent hue. Gold is a line and numeral color, never a large fill.

## Type

- Display and reading: Iowan Old Style → Palatino → Georgia. Used for h1/h2, the landing title, questions, study prompts, review questions, and **body prose** (18px / 1.66).
- UI and metadata: system sans. Labels, buttons, inputs, tables, captions (12–16px).
- Technical annotations: system mono (`--font-mono`). Document strip, section codes, spec-table labels, figure tags, and flow numerals. 12px, sentence case, tabular numerals where values compare. This third family is deliberate: it is the drafting voice, not a second UI font.
- Inner-screen h1 `clamp(30px, 3.2vw, 40px)`; landing title 46–58px on desktop, 38–54px under 760px, and 28–40px under 480px (29px at 320). The landing title stays within two lines at the tested widths.
- Numerals are tabular wherever they update or compare (score, progress, answer grid).
- Measure: prose 64ch, question 30ch, lead 42–56ch. Drop cap only on `.prose > p:first-child`.

## Grid and surfaces

- Masthead: 56px sticky, 1px ink rule below, brand left, student meta right.
- Sheet: full-width paper inside a 12px frame, 1px edge, **0 radius**, no shadow.
- Content column: 1120px max, 36px side padding (16px on phones).
- Drafting shell: an absolute `.draft-frame` inset 10px with a 1px border, a 5px top/left tick strip at 0.3 opacity, and four L-shaped crop marks at its corners. It is `aria-hidden` and `pointer-events: none`.
- Document strip: one row of cells (title, subject, revision, counts) separated by 1px rules; mono annotations. On phones the middle cells hide; at 360px the count cell also hides.
- Landing: a 12-column × 5-row grid of bordered cells. Row areas: code 8 / media 4; mascot 1 + title 7 / media 4; lead 5 + CTA 3 / media 4; spec table 8 / media 4; flow 12. The photo spans rows 1–4. Internal separators are 1px; the outer cell edge is 1px strong.
- Identity: one full-width framed cell; intro copy and form separated by a 1px rule; the form is a two-column grid (Nama/Kelas, then NIS) that collapses on phones.
- Materi: framed grid, 210px index + article, 1px vertical division; the sticky index and the article are cells. Article sections use 1px rules; the study deck is a nested 1px cell.
- Kuis: framed grid, flexible question cell + 240px answer sheet, 1px vertical division; the answer sheet fills the row. Under 760px it stacks below the options with a 1px top rule.
- Hasil: score band, guide, and review are each framed 1px cells; internal rows use 1px rules. The review is the answer sheet, not a card.
- Section separators are **1px** `--rule-strong`; rows and cell divisions are 1px `--rule`. Gold 2px lines are reserved for accents (study answer reveal, progress/focus), never for section separators.
- Responsive: landing stacks to one column at 1100px; materi index hides and quiz answer sheet moves below at 760px; the flow stacks at 760px; 480px tightens labels/cells; 360px drops the last document-strip cell.

## Components

- Buttons: 48px min height, square, 2px border. Primary deep green; secondary transparent with a control border; active nudges 1px.
- Section code: mono, gold-strong, 12px, with a 1px rule running to the end of its cell. Codes are `00 / Ringkasan` … `04 / Hasil`; decorative duplicates of the h1, so `aria-hidden`.
- Spec table: three adjacent cells with 1px divisions; mono label above a display-size value. It reads as the cover's figure table, not a stat card.
- Figure tag: mono "Fig. 01 · Interior masjid" above the landing photo; caption and credit stay directly below with a 1px rule.
- Index (materi): each row is a 48px button; active row is a solid deep-green field with paper text, no left-bar.
- Options (kuis): ruled rows inside a 1px bracket; letter in a 30px square; selected row becomes `--accent-soft` with a filled letter square. No cards, no rounded pills.
- Answer grid: 34px squares, tabular numerals, filled when answered, gold outline for the current question.
- Study deck: nested paper cell with a 1px ink frame; header separated by a 1px rule; answer area has a 2px gold top rule.
- Results: score band framed by 1px rules, score display in gold; guide rows ruled with the active band in gold-soft; review rows are marked exam answers with square status pills and a gold top rule over each explanation.
- Images: 16:9, 1px ink border, caption and credit directly below with a 1px rule. No rounded corners, no overlays on the photo.
- Mascot Lentera: single-stroke etching, open paths, hatched body, no fills, no face. 64px in the study deck, 46px on the cover. Colored `--gold-strong`.

## Ornament

One fixed inline SVG in `main`: a diamond lattice pattern plus two floating outlines (dome, lantern). It is `aria-hidden`, `pointer-events: none`, blurred 1.6px, and covered by a 42% paper veil, so the lattice reads clearly as texture while text contrast stays intact. Static: no drift animation. The drafting frame, tick strips, and crop marks are the only other ornament; there is no page-ruler or scrollbar imitation.

## Motion

- Lentera bobs 5s and its flame pulses 3s; on `data-mood="happy"` the bob speeds to 2.2s and the spark appears.
- Answer reveal 180ms; progress width 180ms. All other transitions 120ms.
- `prefers-reduced-motion` removes the bob, flame, reveal, and transitions; state changes remain visible.

## Accessibility

- Light theme only (product decision). `color-scheme: light`; one `theme-color`.
- Contrast verified at 1440px on all five screens (22 / 22 / 43 / 24 / 120 text elements checked) and on the landing at 320px: zero WCAG AA failures. Overflows checked at 320, 390, 768, 1024, and 1440px: zero.
- One visible h1 per screen; section codes are `aria-hidden`; hierarchy, labels, alt text, and focus verified after the spec-sheet change.
- Interactive targets ≥48px except the inline image-credit link (94×39px; WCAG 2.5.8 AA met, 44px AAA not targeted).
- Focus ring 3px gold at 2px offset; skip link on paper/gold with ink text.

## Do not

- Reintroduce rounded cards, gradients, glassmorphism, or a dark theme.
- Reintroduce a fixed right-edge ruler or any scrollbar-like page furniture.
- Use 2px rules for section separators; keep section rules at 1px. Heavy gold accents are separate.
- Animate the background pattern or add decorative floating shapes beyond the one SVG.
- Put the mascot on every screen, give it a face, or use it as a loading spinner.
- Use gold as a text color for long copy or a large fill.
- Change fiqh copy, the linear flow, image credits, or the 10-question structure to serve the visual system.
