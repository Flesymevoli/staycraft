# Analysis prototype

Third page: Home / Work / Analysis. Create and My Homestay remain lightweight previews.

- Open the bundled HTML at #analysis, or select the third navigation icon.
- Scrub daily occupancy with pointer/touch or the keyboard range control; reset to the period average and switch between 7 and 28 days.
- Why expands evidence and highlights Monday–Thursday. The recommendation sheet opens an editable promotion draft, saved to Work for review.
- Booking pace expands inline; room performance opens a bottom sheet.
- All data is synthetic and session-only. No publishing, sending, pricing changes or OTA connection.

## Demo consistency

Sep 14–20: 50, 60, 60, 70, 80, 100, 70 percent, with equal daily capacity. Mean 70%; weekdays 64%; weekends 85%. Previous week mean 65%, a 5 percentage-point increase. Room totals equal 49/70 booked room nights. Booking pace concerns the following week and is labelled separately.

## Chart design sources

Adapted from the installed lieflat-chart gallery implementations: F2 Hairline Line (daily line, ticks, hollow weekend points) and F5 Tick Rows (weekday/weekend comparison). L3 was considered too dense for this mobile overview; L15 tally loses the chronological reading; F3 area adds unnecessary visual weight. Existing Outfit typography and the light-blue project palette take priority over gallery defaults.

Validation: qa-analysis.cjs covers chart selection, range change, evidence, draft handoff, room sheet, language, keyboard, Home entry and responsive widths. Regenerate the offline preview with export-preview.ps1. UI_STYLE.md is intentionally unchanged.
