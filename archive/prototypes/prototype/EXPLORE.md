# Explore prototype

Fourth navigation destination: Home / Work / Analysis / Explore / My Homestay.
Analysis describes the property's own performance; Explore describes a fictional surrounding market.

- Editorial heading followed by a demand curve, September heatmap, rate spectrum, topic circles and a horizontal stay carousel.
- Selected date is shared across demand, calendar, rates and stays. Tap, touch scrub, range keyboard controls and date select provide alternatives.
- Calendar dates open a sample-context sheet. Opportunity opens comparison or the existing promotion draft in Work. Nothing is sent, repriced or published.
- Review topics open fictional excerpts; counts refer to 42 synthetic reviews with overlapping topics.
- September 26 scenario: higher demand, fictional arts weekend, your rate ¥520, sample market range ¥460–¥590, stays A/B ¥490/¥560. Other dates are deterministic sample scenarios.
- Market band occupies the centre half of the rate spectrum; the marker shows ¥520 relative to that date's illustrative range. Rates exclude no promised inclusions and are not market recommendations.
- Property illustrations are CSS artwork, not photos of real properties.
- No network requests, location access, OTA data or backend. State resets on refresh. English and Chinese supported.

Validation: qa-explore.cjs checks calendar, shared dates, sheets, opportunities, prices, reviews, keyboard, carousel, languages, routes and widths 320/375/430/812. qa-explore-touch.cjs checks mobile touch scrubbing. Reduced motion disables decorative transitions. Rebuild with export-preview.ps1.
UI_STYLE.md and course wireframes are intentionally unchanged.
