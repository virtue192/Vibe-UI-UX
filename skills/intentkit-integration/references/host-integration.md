# Host integration

## Native Web

Keep effect.json and render-kit together. Validate the spec and call attachEffect(existingElement, spec). Include effectCSS if the effect needs its layer styling. On removal, call dispose. Changing list children requires rebinding after disposal. Do not replace the business click handler with an animation handler.

The existing runtime owns independent translate/scale, or list child translate/opacity. It preserves the element's existing transform. Check whether the host already manages those independent properties. For composition, use its unified controller; do not attach multiple controllers with overlapping restoration logic.

## React

Use the exported useIntentEffect hook with a ref to the actual target. Confirm cleanup under StrictMode, rerender and unmount. The host supplies React; the effect is not a new React application. A wrapper component may alter layout, so prefer a hook when preserving DOM is important. Do not claim every SSR framework is supported from one client test.

## Generated effects

Keep the supplied sandbox runner. Integrate its host container using an effect/ref cleanup if necessary. Parameters pass through the existing validated message protocol; no Key or business API enters the frame. Initialization does not prove semantic correctness, cleanup or parameter effectiveness. Generated code currently has no common deterministic-frame API.

## Fragment packages

Bind documented onAction / onSubmit hooks. A local demo response is not a real backend. Keep label/error relationships, failure input retention and actual business success semantics intact.
