# Customer Portal Design Notes

The portal uses the persisted global theme tokens from `src/index.css` and the existing React routes and API data. Keep booking, menu, cart, checkout, order and booking-detail behavior owned by their current pages.

## Visual direction

- Warm hospitality editorial style: charcoal or parchment surfaces, restrained gold accents, Playfair Display SC headings, and Karla interface text.
- The `/rooms` landing route gets a customer welcome panel and the existing room-search page remains directly below it.
- Customer navigation becomes a compact fixed five-item bar on narrow screens; the desktop navigation stays in the account header.
- Room/content cards use short entrance and hover transitions. The welcome emblem has slow CSS-only orbit motion; reduced-motion settings disable animation and transitions.
- Light and dark themes use the same semantic design tokens and are toggled globally from the header or login screen.

## Content and behavior

- Use only real room, menu, booking and order data already provided by the app. Do not add invented availability, pricing, reviews, ratings or testimonials.
- Preserve form labels, keyboard focus visibility, route guards, and API handlers when changing presentation.
- Keep interactive targets at least 44px high and leave safe-area room beneath the mobile navigation.
