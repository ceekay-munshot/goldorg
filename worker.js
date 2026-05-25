/**
 * Minimal Worker — delegates every request to the static assets
 * bound at ASSETS. Static-assets-only mode was misbehaving on the
 * deploy, so we wrap it in an explicit fetch handler.
 */
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
