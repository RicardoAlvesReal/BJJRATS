import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrige ícones padrão do Leaflet que quebram no Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

export interface AcademyMapItem {
  id: string;
  name: string;
  ownerName?: string;
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

interface AcademyWithCoords extends AcademyMapItem {
  lat: number;
  lng: number;
}

// Cache global de geocodificação (persiste entre re-renders)
const geocodeCache = new Map<string, [number, number] | null>();

async function geocodeCity(city: string, state: string): Promise<[number, number] | null> {
  const key = `${city}|${state}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const q = encodeURIComponent(`${city}, ${state}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'BJJRats/1.0 (bjjrats.app)' } },
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(key, coords);
      return coords;
    }
  } catch { /* silencioso */ }
  geocodeCache.set(key, null);
  return null;
}

// Ícone personalizado — pin vermelho BJJ
const academyIcon = L.divIcon({
  html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 10.4 13 21 13 21s13-10.6 13-21C26 5.82 20.18 0 13 0z" fill="#CC0000" stroke="#7A0000" stroke-width="1"/>
    <circle cx="13" cy="13" r="5.5" fill="white"/>
    <text x="13" y="17" text-anchor="middle" font-size="7" font-family="sans-serif" font-weight="bold" fill="#CC0000">BJJ</text>
  </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -36],
  className: '',
});

// Ícone de localização do usuário — ponto azul
const userIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#1A6ECC;border:3px solid white;box-shadow:0 0 8px rgba(0,100,255,0.6)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
  className: '',
});

/** Quando a lista de academias muda, ajusta o mapa para enquadrá-las todas */
function FitBounds({ academies }: { academies: AcademyWithCoords[] }) {
  const map = useMap();
  useEffect(() => {
    if (academies.length === 0) return;
    if (academies.length === 1) {
      map.flyTo([academies[0].lat, academies[0].lng], 13, { duration: 1 });
    } else {
      const bounds = L.latLngBounds(academies.map(a => [a.lat, a.lng] as [number, number]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academies]);
  return null;
}

interface AcademyMapProps {
  academies: AcademyMapItem[];
}

export function AcademyMap({ academies }: AcademyMapProps) {
  const [geocoded, setGeocoded] = useState<AcademyWithCoords[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Geocodificação sequencial com respeito ao rate-limit do Nominatim (1 req/s)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setGeocoding(true);
      const results: AcademyWithCoords[] = [];
      for (const a of academies) {
        if (cancelled) break;
        if (a.lat && a.lng) {
          results.push(a as AcademyWithCoords);
        } else if (a.city && a.state) {
          const pos = await geocodeCity(a.city, a.state);
          if (pos) results.push({ ...a, lat: pos[0], lng: pos[1] });
          await new Promise(r => setTimeout(r, 700)); // respeita rate-limit
        }
      }
      if (!cancelled) {
        setGeocoded(results);
        setGeocoding(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [academies]);

  // Geolocalização do usuário
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => { /* permissão negada — sem problema */ },
    );
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {geocoding && academies.length > 0 && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(0,0,0,0.75)', color: '#FFF', padding: '4px 12px',
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase',
          letterSpacing: '0.06em', borderRadius: 2, pointerEvents: 'none',
        }}>
          Localizando academias…
        </div>
      )}
      <MapContainer
        center={[-14.235, -51.925]}
        zoom={4}
        style={{ width: '100%', height: '420px' }}
        scrollWheelZoom
      >
        {/* Satélite Esri — gratuito, sem API key */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri — Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
          maxZoom={18}
        />
        {/* Labels sobre o satélite */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          maxZoom={18}
          opacity={0.7}
        />

        <FitBounds academies={geocoded} />

        {geocoded.map(a => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={academyIcon}>
            <Popup minWidth={180}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', marginBottom: 2 }}>
                  {a.name}
                </div>
                {a.ownerName && (
                  <div style={{ fontSize: '0.82rem', color: '#555' }}>Prof. {a.ownerName}</div>
                )}
                {(a.city || a.state) && (
                  <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    📍 {[a.city, a.state].filter(Boolean).join(' — ')}
                  </div>
                )}
                {a.address && (
                  <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>{a.address}</div>
                )}
                {a.phone && (
                  <div style={{ fontSize: '0.82rem', marginTop: 4 }}>📞 {a.phone}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem' }}>
                📌 Você está aqui
              </span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
