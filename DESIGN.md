---
name: Weils Monitor
description: A measured observability workspace for frontend health and behavior.
colors:
  deep-sea: "#102238"
  signal-teal: "#30988f"
  anomaly-terracotta: "#d5795c"
  caution-amber: "#dcae56"
  ink: "#173044"
  muted-ink: "#607783"
  mineral-line: "#dce7e3"
  paper: "#fff"
  mineral-ground: "#edf2ef"
  action-teal: "#257a74"
  action-teal-hover: "#246f69"
typography:
  display:
    fontFamily: '"Noto Serif SC", "Noto Sans SC", "Microsoft YaHei", serif'
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Noto Serif SC", "Noto Sans SC", "Microsoft YaHei", serif'
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  metric:
    fontFamily: '"Barlow Semi Condensed", "Noto Sans SC", "Microsoft YaHei", sans-serif'
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "12px"
  label:
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "11px"
    fontWeight: 700
rounded:
  panel: "14px"
  control: "8px"
  navigation: "10px"
  tag: "5px"
  dialog: "16px"
spacing:
  compact: "8px"
  control-gap: "10px"
  panel-gap: "18px"
  panel-inset: "23px 25px"
  content-inset: "35px 42px 23px"
components:
  button-primary:
    backgroundColor: "{colors.action-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.action-teal-hover}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  navigation-active:
    backgroundColor: "#2c746f"
    textColor: "{colors.paper}"
    rounded: "{rounded.navigation}"
    padding: "12px 14px"
  tag-default:
    backgroundColor: "#e9f3ef"
    textColor: "{colors.action-teal-hover}"
    rounded: "4px"
    padding: "5px 7px"
  token-input:
    backgroundColor: "#fbfdfb"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: Weils Monitor

## Overview

**Creative North Star: "The Observability Atlas"**

The workspace resembles a calm instrument panel: a deep sea navigation rail frames pale mineral surfaces, while colored data signals carry the visual urgency. Serif headings give each analytical section a clear title; condensed numerals make high density readings easy to compare.

The visual system supports the product's need to distinguish live results from demonstration data and to move between engineering and product views. It favors labeled charts, visible data state, thin measurement lines, and restrained depth.

**Key Characteristics:**
- Deep navy navigation against mineral gray ground and white analysis surfaces.
- Teal for normal activity, terracotta for errors, amber for caution or demonstration state.
- Compact labels, tabular numerals, and generous space around major charts.
- Labeled visualizations with fine guides and restrained panel chrome.

## Colors

The palette uses cool maritime neutrals as structure and a small set of functional signal colors.

### Primary
- **Signal Teal** (`#30988f`): chart lines, healthy metric segments, and legend markers.
- **Action Teal** (`#257a74`): primary action fill; its deeper hover state is `#246f69`.

### Secondary
- **Anomaly Terracotta** (`#d5795c`): error series, severity markers, and poor experience segments.
- **Caution Amber** (`#dcae56`): fair experience segments and demo or caution cues.

### Neutral
- **Deep Sea** (`#102238`): navigation rail and chart tooltip background.
- **Ink** (`#173044`): base reading color.
- **Muted Ink** (`#607783`): quieter labels and supporting copy.
- **Mineral Ground** (`#edf2ef`): application canvas.
- **Paper** (`#fff`): panels, metric strip, and controls.
- **Mineral Line** (`#dce7e3`): panel boundary and quiet separators.

### Named Rules

**The Signal Role Rule.** Use teal for activity or healthy states, terracotta for errors, and amber for caution. Keep the chart legend and related readings consistent with those roles.

## Typography

**Display Font:** Noto Serif SC with Noto Sans SC and Microsoft YaHei fallbacks.
**Body Font:** Noto Sans SC with Microsoft YaHei and system fallbacks.
**Numeric Font:** Barlow Semi Condensed with Chinese sans fallbacks.

**Character:** Editorial headings identify the analytical sections; dense sans copy stays functional. Condensed, tabular numerals make key readings scan quickly.

### Hierarchy
- **Display** (700, 29px, 1.2): main page title; 25px on narrow screens.
- **Headline** (700, 16px): panel headings; 15px on narrow screens.
- **Metric** (700, 34px, 1.2): headline values; 29px at 1200px and 28px at 640px.
- **Body** (12px): controls, tables, chart support, and explanatory text.
- **Label** (11px, commonly 700): captions, metadata, legends, and navigation group labels; dense chart labels also use 10px.

**The Numeric Scan Rule.** Use tabular numerals for metrics, timestamps, route counts, and tables so changing values retain alignment.

## Layout

The desktop shell uses a sticky 232px left rail and a flexible content column. Main content is capped at 1720px with a 42px horizontal inset. Four metrics share one strip; the primary analysis row gives the trend chart about twice the width of the issue list. Lower panels use two equal columns and 18px gaps.

At 1200px the rail becomes 202px and content insets reduce to 26px. At 920px the rail becomes a 240px slide-in menu and analytical columns stack. At 640px content uses 16px side insets, metrics become a two by two grid, and filters remain side by side. Tables scroll horizontally when their 650px minimum width exceeds the viewport.

## Elevation & Depth

White surfaces sit on mineral ground with a thin border and a diffuse, low contrast shadow. The dialog is the only strongly elevated surface. Navigation selection relies on fill contrast rather than elevation.

### Shadow Vocabulary
- **Panel ambient** (`0 9px 26px rgba(16, 39, 48, 0.03)`): standard analysis panels and summary strips; the metric strip uses 0.035 alpha.
- **Selected role** (`0 3px 8px rgba(5, 19, 31, 0.17)`): active segment in the rail.
- **Dialog** (`0 25px 80px rgba(7, 28, 38, 0.24)`): modal separation from its backdrop.

## Shapes

Panels and metric groups use gently curved 14px corners. Controls use 8px, rail items use 10px, and small tags use 4–5px. Lines are thin and pale. Circular dots encode status and series identity; rounded bars encode proportions and route activity.

## Components

### Buttons
- **Primary:** filled action teal, white 12px bold label, 8px radius, and 11px by 17px padding; hover deepens the fill.
- **Outline:** white fill, pale border, muted ink, 8px radius, and 10px by 14px padding; hover lightens the surface and strengthens the border.
- **Quiet links:** transparent fill with teal text; hover adds an underline.
- **Focus:** buttons receive a visible 3px teal outline with 2px offset.

### Cards / Containers
- **Analysis panel:** paper fill, mineral border, 14px radius, ambient shadow, and about 23px by 25px internal padding. Mobile padding reduces to 20px by 17px.
- **Metric strip:** one connected surface divided by hairlines so values can be compared without separate card chrome.

### Inputs / Fields
- **Selectors:** 39px tall white controls with a pale border and 8px radius; focus-within adds a pale teal outline.
- **Search and event filter:** compact 36px high outlined controls with 7px radius.
- **Token field:** pale paper fill, 8px radius, and teal border on focus.

### Navigation
- **Rail:** deep navy, 13px semibold links, 10px corners, pale default text, brighter hover fill, and teal active fill. At tablet widths it slides in from the left.
- **Role switch:** two segments inside a dark inset container; the selected view gains a pale fill, dark text, and short shadow.

### Data signals
- **Trend:** teal visits and terracotta errors share a time axis with separate scales. Small dots and direct labels keep the legend quiet.
- **Status and event tags:** compact fills and text colors match the underlying meaning; error and stability tags use terracotta tones.

### Error source context

- Source frames extend the existing event-detail panels: an ordered button list beside a scrollable code excerpt, stacked on narrow screens. The first mapped frame is selected initially.
- Code uses 12px Consolas/monospace with tab size 4 and visible line numbers. The error row reuses the existing error-tag background `#fbebe6`; its column marker and error text reuse error ink `#9c4b37`, with white text on the marker. Focus uses action teal; source code is rendered as text.
- Loading, retry, missing-map, missing-source and demo states stay inside the source panel, independent of the event fields.

## Do's and Don'ts

### Do:
- **Do** preserve a visible distinction between demo and live data in the toolbar and notices.
- **Do** give primary analytical content enough room for labels and comparison.
- **Do** preserve chart and table labels at narrow widths through stacking or horizontal table scroll.

### Don't:
- **Don't** use the anomaly terracotta as a generic action color.
- **Don't** replace quiet panel borders with heavy shadows; reserve strong elevation for a dialog.
- **Don't** scatter related headline readings across unrelated visual containers.
