const VALID_BRANDS = new Set(["every", "posthog"]);

export function currentBrand() {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("brand");
  const brand = VALID_BRANDS.has(requested) ? requested : "every";

  if (requested !== brand) {
    url.searchParams.set("brand", brand);
    window.history.replaceState(window.history.state, "", url);
  }

  return brand;
}

export function withBrand(urlValue, brand = currentBrand()) {
  const url = new URL(urlValue, window.location.href);
  url.searchParams.set("brand", brand);
  return url.toString();
}
