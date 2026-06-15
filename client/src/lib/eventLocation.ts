export interface EventLocationLike {
  title?: string | null;
  location?: string | null;
  locationCep?: string | null;
  locationAddress?: string | null;
  locationNumber?: string | null;
  locationNeighborhood?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationLatitude?: number | string | null;
  locationLongitude?: number | string | null;
}

function clean(value?: string | null) {
  return (value || '').trim();
}

export function formatCep(value?: string | null) {
  const digits = clean(value).replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function getEventAddressLabel(event: EventLocationLike) {
  const street = [clean(event.locationAddress), clean(event.locationNumber)].filter(Boolean).join(', ');
  const cityState = [clean(event.locationCity), clean(event.locationState)].filter(Boolean).join(' - ');
  const cep = formatCep(event.locationCep);

  return [
    street,
    clean(event.locationNeighborhood),
    cityState,
    cep ? `CEP ${cep}` : '',
  ].filter(Boolean).join(', ');
}

export function getEventLocationLabel(event: EventLocationLike) {
  const place = clean(event.location);
  const address = getEventAddressLabel(event);
  if (place && address && place.toLowerCase() !== address.toLowerCase()) return `${place} - ${address}`;
  return place || address;
}

function getCoordinateLabel(event: EventLocationLike) {
  const lat = event.locationLatitude === null || event.locationLatitude === undefined ? '' : String(event.locationLatitude);
  const lng = event.locationLongitude === null || event.locationLongitude === undefined ? '' : String(event.locationLongitude);
  if (!lat || !lng) return '';
  return `${lat},${lng}`;
}

export function getEventMapDestination(event: EventLocationLike) {
  return getCoordinateLabel(event) || getEventAddressLabel(event) || clean(event.location) || clean(event.title);
}

export function getEventMapEmbedUrl(event: EventLocationLike) {
  return `https://www.google.com/maps?q=${encodeURIComponent(getEventMapDestination(event))}&output=embed`;
}

export function getEventGoogleMapsUrl(event: EventLocationLike) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getEventMapDestination(event))}`;
}

export function getEventWazeUrl(event: EventLocationLike) {
  const coords = getCoordinateLabel(event);
  if (coords) return `https://waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(getEventMapDestination(event))}&navigate=yes`;
}
