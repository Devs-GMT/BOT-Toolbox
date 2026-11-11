# BOT Toolbox: design spec (from the antimetal.com study)

This document records what was **measured** on https://antimetal.com/ and how BOT Toolbox adapts it. We study structure, spacing, motion and tone. We do not reuse Antimetal's copy, images, illustrations, logo, name or fonts.

Method: one visit in the Claude desktop app's built-in browser at 1440 x 900 and 390 x 844, no login, no forms, no cookie opt-ins. Values come from `getComputedStyle`, CSS custom properties, `@keyframes` rules and element bounding boxes. Screenshots were taken at every section.

## 0. Where the PRD's guess was wrong

The PRD (section 8) guessed the palette because "the page did not expose colours". It does. The real site is **not** a cool white + cobalt product page.

| Topic | PRD guess | Measured on the reference |
| --- | --- | --- |
| Paper | `#F7F7F4` | `#F5F6F1` (`--paper-light`), warm near-black `#1A1614` (`--paper-dark`) |
| Ink | `#14161B` | `#1A1614` on light, `#FAFBF7` on dark |
| Accent | cobalt `#2453FF` | none for UI. Buttons are ink-coloured pills. Earthy accents are used sparingly (see 1.2) |
| Display font | Inter Display 600 | a serif (Signifier) at weight 400, tight tracking |
| Body font | Inter | Geist Sans |
| Mono | JetBrains Mono | Geist Mono |
| Buttons | 8px radius, cobalt | fully rounded pills, ink on light, paper on dark |
| Page theme | one light theme | the page **swaps between light and dark by section** (dark steps band, warm gradient bridge, light again, dark footer) |
| Motion | GSAP | **no GSAP, no Lenis, no ScrollTrigger on the page**. Pure CSS keyframes with one signature easing |
| Trust bar | text chips | real customer logos (we must not do this, we have no customers) |

BOT Toolbox keeps the PRD's section order and copy, and takes the reference's real *feel*: warm paper, a serif display face, dark "window" mockups on a warm gradient frame, restrained colour, and quick eased reveals. The final colours and fonts depend on the identity direction you pick next (see section 6).

## 1. Tokens

### 1.1 Core palette (measured)

| Token | Value | Use |
| --- | --- | --- |
| `--paper-light` | `#F5F6F1` | page background, light theme |
| `--paper-dark` | `#1A1614` | page background, dark theme, footer |
| `--ink-light` | `#1A1614` | text on light |
| `--ink-dark` | `#FAFBF7` | text on dark, light pill buttons on dark |
| muted on dark | about `#969690` (`oklab(0.673 0 0.005)`) | body copy on dark |
| muted on light | `rgb(92, 89, 86)` = `#5C5956` | footer and secondary text on light |
| hairline | ink at 5% (`--raised-stroke-alpha: 5%`) | raised borders |

### 1.2 Accent set (measured, used sparingly: headline words, pills, counters)

`red #AC4835` · `orange #C96726` · `yellow #C5953B` · `tan #AC8C66` · `green #6D8352` · `blue #7790A2` · `purple #623B6E` · `pink #AD6B70` · `lime #899200`. The count-up stat uses a sage green (`rgb(127,149,100)`) on dark and the orange on light.

### 1.3 Radii and shadows

| Element | Value |
| --- | --- |
| Buttons, nav pill | fully rounded (`9999px`) |
| Footer status pill | `4px` radius, `6px 8px` padding, 13px text |
| Step card outer frame | `20px` |
| Inner "window" card | `10px`, `0.8px solid #FFF`, bg `rgba(250,251,249,0.82)` |
| Window shadow | `0 14px 30px -14px` warm brown at 32% + `0 1px 3px` same hue at 10% |
| Radius scale | xs 2px · sm 4px · md 6px · lg 8px |

### 1.4 Type scale (desktop 1440)

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| H1 (hero) | serif | 53.7px / 58px (1.08) | 400 | -1.07px (-0.02em) |
| H2 (section) | serif | 39.4px / 45.3px (1.15) | 400 | -0.59px (-0.015em) |
| Blog / small H2 | serif | 24px | 400 | n/a |
| Step title (H3) | Geist Sans | 23.95px / 32.3px | 500 | -0.12px |
| Card title (H3) | Geist Sans | 20px / 30px | 500 | n/a |
| Body / sub | Geist Sans | 17.98px / 27.9px (1.55) | 400 | normal |
| Nav / button | Geist Sans | 14.99px / 18.7px | 500 | normal |
| Big stat number | Geist Sans | 75.1px / 76.6px | 400 | -1.88px (-0.025em) |
| Mock UI text | Geist Sans / Mono | 11 to 15px | 400 to 500 | n/a |

Mobile (390): H1 drops to **34.5px**. Everything stacks to one column, cards go full width below their text, nav becomes a logo tile + a menu tile.

### 1.5 Layout and spacing

- Hero mockup is wide, about 1270px of 1440. Step text and cards sit in a narrower column, text from x=212, card from x=629 to 1252 (about 1040px content width, 623px cards).
- Step blocks alternate sides (card right, then left). Text column about 336px wide.
- Section vertical padding about 80px (`py-20`) on the steps wrapper. Gaps between a step's text and card about 80px.
- Nav is 88px tall, a floating pill (not a full-width bar), logo in its own rounded tile on the left, links + CTA in a pill on the right.
- Document height: 9,797px at 1440, 12,242px at 390.

## 2. Page structure (top to bottom)

1. Nav: logo tile, pill with Blog, Careers, divider, Sign In, filled "Book a Demo".
2. Hero: serif H1, one-line sub, one pill CTA, then a large **dark app window** (sidebar-less top bar, a prompt line, a stat strip, two columns of issue cards) with a smaller floating chat panel overlapping its right edge.
3. Trust bar: "Trusted by engineering teams at" + customer logos.
4. Intro statement (large serif H2) then **four numbered steps** on a dark band. Each step: small mono-caps green label (`01 WORLD MODEL`), H3, one paragraph with bold keywords, and a dark UI card on a warm gradient frame.
5. Testimonial with a big stat panel (count-up number, dot-matrix before/after bars) on dark.
6. Warm gradient bridge (dark to peach to paper).
7. "Patrol" grid: H2 on the left, paragraph + text link on the right, then a list of named agent cards (name + category) with one expanded detail card (metric, issue row, scope).
8. "Understand how your environment works": three cards, each with a small animated diagram and a title + short copy underneath.
9. "Your system, at your command": two large panels (a prompt composer, a Slack-style chat mock) with captions.
10. Second testimonial (light stat panel), third testimonial with a video.
11. Closing CTA: serif H2, one sentence, one pill.
12. Blog carousel: horizontal cards with art, category, date, title; prev/next arrows.
13. Footer (dark): link columns (Company, Resources, Compliance), a status pill "All Systems Normal" + an outline pill "Built in NYC", a one-line compliance note, logo mark bottom right.

## 3. Motion (measured from the page's own CSS)

There is **no JS animation library** on the page (`gsap`, `ScrollTrigger`, `Lenis`, `anime`, `THREE`, `lottie` are all undefined; it is a Next.js build). Everything is CSS keyframes started when elements enter the viewport.

**Signature easing: `cubic-bezier(0.22, 1, 0.36, 1)`** (a strong ease-out, close to easeOutQuint). Hover colour changes use `0.15s cubic-bezier(0.4, 0, 0.2, 1)`.

| Name | What it does | Duration | Delay / stagger | Trigger |
| --- | --- | --- | --- | --- |
| `intro-drop` | nav drops in: opacity 0 to 1, `translateY(-0.5rem)` | 0.3s ease-out | none | load |
| `hd-word` | hero headline reveals word by word (opacity) | 0.35s ease-out | 24ms per word | load |
| `hd-rise` | sub and CTA rise: opacity, `translate 0 0.375rem` | 0.4 to 0.45s, signature ease | 0s and 0.5s | load |
| `hdx-cm-fade` | hero mockup rows fade in on an **eased stagger** | 0.3s ease-out | 0.09, 0.162, 0.229, 0.292, 0.349, 0.401, 0.448, 0.491s (each step smaller than the last) | load |
| `scroll-reveal` | section content: opacity, `translate 0 1rem` | **0.8s**, signature ease | **80ms** per item (0, 0.08 ... 0.4s) | enters viewport |
| `ctx-arrive` | small cards arrive: opacity, `translate 0 0.375rem` | 0.45s, signature ease | n/a | in-card sequence |
| `dm-fade`, `dm-row-open`, `dm-enter`, `dm-tick-land` | rows open, ticks land in the step mini-cards | 0.38s, signature ease | n/a | enters viewport |
| `dm-mark` | check mark draw | 1.6s, `cubic-bezier(.4,0,.2,1)` | n/a | with `dm-enter` |
| `dm-spin` | loading spinner | 1.1s linear, infinite | n/a | while "working" |
| `dm-shimmer` | text shimmer while "thinking" (mask-position) | 2s linear, infinite | n/a | while "working" |
| `dot-reveal-settle` | headline "decode": text drawn as dots, then settles to its colour | 0.14s ease-out per dot (223 of them) | staggered | enters viewport |
| `patrol-lib-dot-in` | dots in the agent list rise 4px and fade | 0.35s, signature ease | 16ms per dot | enters viewport |
| `patrol-lib-result-in` | result card: opacity, `translateY(8px)` | 0.6s, signature ease | 0.9s | enters viewport |
| `patrol-lib-pulse` | idle pulse | 2.4s ease-in-out, infinite | n/a | always |
| `ctx-ping-*` | node pings in the diagram | 1.2s ease-in-out, infinite | n/a | always |
| `pulse-ring` | status ring: opacity 0.4 to 0, scale 1 to 3.4 | n/a | n/a | live dots |
| `hd-press` | button press: scale 0.97 at 50% | n/a | n/a | click |

Other observed behaviour:

- **Theme swap by scroll**: the page background and text flip between light and dark per section (`--paper` / `--ink` variables, `--theme-ease: ease`). The warm gradient section is the bridge.
- **Stat count-up**: the big number counts from 0 to its value (observed `0` then `41`; `0` then `82`) when its panel enters view.
- **Dot-matrix charts** in the testimonials (a grid of dots as the bar chart, "Before" and "After").
- Properties animated: `opacity` and `translate`/`transform` almost everywhere. Exceptions: `mask-position` (shimmer), `background-position` (glint), `outline-width` (ping), `filter: blur` (text reveal). We will stick to opacity and transform only.
- Not measured: the hero mockup's full timed sequence (typing, results appearing), hover appearance of cards and buttons (the browser pane did not register hover reliably; only the 0.15s transition curve is confirmed), and the sticky behaviour of the nav (it is `position: static` on the header element, the floating pill is positioned inside it and stayed visible on scroll in every screenshot).

## 4. Components (what to build, in our own look)

| Component | Pattern taken |
| --- | --- |
| Nav | floating pill + separate logo tile, 88px band, collapses to logo tile + menu tile on mobile |
| Primary button | 47px tall, `16px 24px`, 15px/500, fully rounded, ink fill (paper fill on dark), 0.15s colour transition |
| Step label | small mono caps, accent green, number + name |
| Step card | dark window (10px radius, 0.8px light border) inside a 20px warm gradient frame with soft grain |
| Mini-cards | table or list rows, status pills, one row "in progress" with spinner then check |
| Agent card | name + category on one line, 1 metric, 1 result row, scope tag |
| Stat panel | big number with count-up, label, dot-matrix chart |
| Footer status | small pill with a dot, plus an outline pill |

## 5. PRD section to reference section map

| PRD home section | Follows reference section |
| --- | --- |
| Navbar | Nav: floating pill + logo tile |
| 1 Hero | Hero: serif H1 word reveal, sub, one pill CTA, large dark app window with a floating panel |
| 2 Trust bar | Trusted-by row, but **text chips of the tools we really use** (ethers.js, OpenZeppelin, BOT Chain RPC, MetaMask), no customer logos |
| 3 Step 01 Units | Numbered step 01 (mini-card on a gradient frame, text on the left) |
| 4 Step 02 Hash and encode | Numbered step 02 (card left, text right) |
| 5 Step 03 Checks the chain | Numbered step 03 |
| 6 Step 04 Signs and verifies | Numbered step 04 (code-diff + checks card becomes signature + recorded-on-chain card) |
| 7 Tools grid | "Patrol" agent card grid |
| 8 Toolbox from anywhere | "Your system, at your command": prompt composer + Slack-style chat becomes the Ctrl K palette + shareable links |
| 9 Closing CTA + guides | Closing CTA + research-log carousel, as a 3-card guides grid |
| Footer | Dark footer with link columns and "All Systems Normal" pill, upgraded to the live system check |

No testimonials: we have no real ones, so the PRD correctly leaves them out. The count-up stat panel is reused only with real numbers from the chain (statements recorded), or an honest empty state.

## 6. Adaptation decisions (pending your identity choice)

- **Fonts**: Signifier is a paid typeface and Geist's licence is fine but it is *their* voice. We will pick our own free, self-hosted pair that fits the chosen identity direction.
- **Colour**: warm paper + warm near-black + one restrained accent. The accent is the identity decision.
- **Theme swap by scroll**: keep, it is the most recognisable part of the reference. We keep it light for most of the page and dark only for the steps band and footer.
- **Motion**: implement with GSAP as the PRD asks, using the same numbers (0.8s reveals, 80ms stagger, `0.22, 1, 0.36, 1` as a custom ease), transform and opacity only, and `prefers-reduced-motion` support.

## 7. Evidence gaps

- Claude in Chrome was not connected, so the built-in browser was used. Installed Chrome through puppeteer-core was refused by the site's server (connection reset); we did not work around that.
- Screenshots from the pane are low resolution (about 560 px wide), good for layout and not for pixel detail.
- Mobile at 390 px was captured for the hero and steps only. The first load of the page rendered black for a moment before fading in; we did not measure that intro.
- No hover captures, no frame-by-frame sampling of the hero sequence.

## 8. Chosen identity: B "Mono" (decided), reconciled with the PRD and the reference

The PRD fixes the content, the 9 sections, the tools, the footer and the states. The reference fixes the page structure, rhythm and motion. Identity B only decides colour, type, logo and component look. Where they disagree, the order of authority is PRD, then reference, then B.

| Topic | Decision |
| --- | --- |
| Copy, sections, tools, footer, states | PRD, unchanged |
| Section order and page rhythm | Reference (sections 2 and 5 of this doc) |
| Theme swap | Kept: light page, dark steps band, light again, dark footer. Dark = `#141414` |
| Paper / ink | `#FAFAF7` paper, `#141414` ink (B), muted `#6B6B66`, hairline `#DDDDD6` |
| Accent | Vermilion `#FF4F1F` replaces the PRD's cobalt. Used for the primary button, status squares, focus ring and the typing cursor only |
| State colours | PRD values kept: success `#1F9D55`, warning `#D97706`, error `#DC2626`. Vermilion is close to error red, so errors always carry an icon and text, never colour alone |
| Display font | IBM Plex Mono 500, tracking -0.06em (stands in for the reference's serif) |
| Body font | IBM Plex Sans 400/500 (stands in for the reference's Geist / PRD's Inter) |
| Mono / code | IBM Plex Mono. All fonts self-hosted (no Google Fonts at runtime) |
| Radii | 4px controls and cards (B), pill is not used. Dark mockup window 6px |
| Cards | white, 1px ink border for tool cards (B), hairline for the rest. Header row: step number + `tool.mode` + status square + `ready` |
| Mockup frame | the reference's warm gradient frame becomes a flat paper-2 (`#F1F1EC`) panel with a dashed hairline, so no gradients or grain |
| Logo | black hexagon, vermilion `>` prompt chevron and a paper underscore; wordmark `bot/toolbox` in mono |
| Motion | GSAP with the reference numbers: 0.8s reveals, 80ms stagger, custom ease `0.22, 1, 0.36, 1`, transform and opacity only. Signature interactions: typing cursor, result flash (vermilion to paper, 400ms), odometer block number |
| Icons | 8 custom 1.5px line icons, square caps, matching the hexagon logo |
| Keyboard hints | lowercase mono chips: `ctrl k` |

## 9. Second pass: closer to the reference (Nov 11)

A deeper study (measured, not eyeballed) showed where the first build drifted. The site now follows these reference patterns, still with BOT Toolbox's own logo, copy and vermilion accent:

| Pattern | Measured on the reference | Now on BOT Toolbox |
| --- | --- | --- |
| Nav | two floating tiles, not a bar: logo tile and link group, paper at 70% + `backdrop-filter: blur(12px)`, radius 8, 1px ink ring at 5%, inset white highlight | same, and both tiles turn to dark glass over dark sections |
| Display type | serif, 400, -0.02em, centred hero | Newsreader 400, centred hero, serif section heads |
| Hero background | 6px dot grid (`radial-gradient` 1.85px dots), cursor spotlight mask 110px | 6px dot grid with a cursor spotlight |
| Hero product | dark app window 1266px wide, radius 16, ring `rgba(250,251,247,.12)` and a deep shadow; a 403px floating panel offset 52px down and 30px past the right edge | same sizes; the panel is "Copy as code" |
| Content column | 1080px | 1080px |
| Steps | dark grain field; each row is a 416px copy column + 652px "grain window" (radius 8, `linear-gradient(168deg, #463F39, #AD8068 40%, #4B403B 80%)`, 6px dots, inner dark panel radius 6, 36px inset), alternating sides, 12px gap | same structure; the four mini demos now live in dark panels |
| Step label | 13px uppercase, accent colour, number first | same, vermilion tint on dark |
| Agent library | heading left, paragraph and link right; list of agents left, detail card (radius 10, translucent paper, warm shadow) on a sunset gradient right | the eight tools as the list; the detail card shows a real example result per tool, auto-advances every 5 s, hover or click to pick |
| Three cards | 352 x 400 art cards with dots, a small UI card inside, title and text below | shareable links, ctrl K, copy as code |
| Tail | closing CTA, blog row and footer on dark, dashed hairlines between footer columns, status pills | closing CTA, guides row, footer with dashed columns, status pills and the live system check |
| Buttons | pills, sans 15px | pills, Inter |
