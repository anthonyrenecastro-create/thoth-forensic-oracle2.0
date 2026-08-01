import { useMemo, useState } from 'react';
import { Circle, LayersControl, MapContainer, Marker, Polygon, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CandidateZone, ForensicCase, ForensicTwinResult } from '../../types/forensic';
import type { GeoPoint } from '../../types/geospatial';
import { $d, Id, Io } from '../../engine/forensicAnalytics';

const center: [number, number] = [47.676, -65.649];

function asLatLngs(zone: CandidateZone): [number, number][] | null {
  return Io(zone);
}

function markerPoint(zone: CandidateZone): [number, number] | null {
  if ('lat' in zone.geometry) {
    return [zone.geometry.lat, zone.geometry.lng];
  }
  return Id(zone);
}

function styleForZone(zone: CandidateZone, twin: 'a' | 'b') {
  return $d(zone, twin);
}

interface Props {
  caseRecord: ForensicCase;
  twinA?: ForensicTwinResult;
  twinB?: ForensicTwinResult;
  layerVisibility: Record<string, boolean>;
}

export function ForensicMap({ caseRecord, twinA, twinB, layerVisibility }: Props) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const overlapIds = useMemo(() => {
    if (!twinA || !twinB) {
      return new Set<string>();
    }
    const aTop = twinA.rankedZones.slice(0, 5).map((zone) => zone.id);
    const bTop = twinB.rankedZones.slice(0, 5).map((zone) => zone.id);
    return new Set(aTop.filter((id) => bTop.includes(id)));
  }, [twinA, twinB]);

  const conflictIds = useMemo(() => {
    if (!twinA || !twinB) {
      return new Set<string>();
    }
    const aTop = twinA.rankedZones.slice(0, 5).map((zone) => zone.id);
    const bTop = twinB.rankedZones.slice(0, 5).map((zone) => zone.id);
    return new Set([...aTop.filter((id) => !bTop.includes(id)), ...bTop.filter((id) => !aTop.includes(id))]);
  }, [twinA, twinB]);

  const selectedZone =
    (twinA?.rankedZones.find((zone) => zone.id === selectedZoneId) ||
      twinB?.rankedZones.find((zone) => zone.id === selectedZoneId) ||
      caseRecord.candidateZones.find((zone) => zone.id === selectedZoneId)) ??
    null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">Interactive Forensic Map</h2>
      <div className="text-xs text-slate-700">Context-only mines and hypothetical polygons are excluded from posterior by default unless independent evidence links them.</div>
      <MapContainer center={center} zoom={10} style={{ height: 520, width: '100%' }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topographic">
            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution="&copy; OpenTopoMap" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Evidence points">
            <>
              {caseRecord.evidence
                .filter((item) => item.location && 'lat' in item.location)
                .map((item) => {
                  const point = item.location as GeoPoint;
                  return (
                  <Marker
                    key={item.id}
                    position={[point.lat, point.lng]}
                    icon={L.divIcon({
                      className: 'evidence-badge',
                      html: `<span style=\"background:#111827;color:white;padding:2px 6px;border-radius:10px;font-size:10px;\">${item.grade}</span>`,
                    })}
                  >
                    <Popup>
                      <div>
                        <strong>{item.title}</strong>
                        <div>{item.description}</div>
                        <div>Source: {item.sourceType}</div>
                      </div>
                    </Popup>
                  </Marker>
                  );
                })}
            </>
          </LayersControl.Overlay>

          {layerVisibility.twinA && twinA && (
            <LayersControl.Overlay checked name="Twin A ranked zones">
              <>
                {twinA.rankedZones.map((zone) => {
                  const polygon = asLatLngs(zone);
                  if (polygon) {
                    return (
                      <Polygon
                        key={`a-poly-${zone.id}`}
                        positions={polygon}
                        pathOptions={styleForZone(zone, 'a')}
                        eventHandlers={{ click: () => setSelectedZoneId(zone.id) }}
                      >
                        <Popup>{zone.name}</Popup>
                      </Polygon>
                    );
                  }
                  const point = markerPoint(zone);
                  return point ? (
                    <Marker key={`a-m-${zone.id}`} position={point} eventHandlers={{ click: () => setSelectedZoneId(zone.id) }}>
                      <Popup>{zone.name}</Popup>
                    </Marker>
                  ) : null;
                })}
              </>
            </LayersControl.Overlay>
          )}

          {layerVisibility.twinB && twinB && (
            <LayersControl.Overlay checked name="Twin B ranked zones">
              <>
                {twinB.rankedZones.map((zone) => {
                  const polygon = asLatLngs(zone);
                  if (polygon) {
                    return (
                      <Polygon
                        key={`b-poly-${zone.id}`}
                        positions={polygon}
                        pathOptions={styleForZone(zone, 'b')}
                        eventHandlers={{ click: () => setSelectedZoneId(zone.id) }}
                      >
                        <Popup>{zone.name}</Popup>
                      </Polygon>
                    );
                  }
                  const point = markerPoint(zone);
                  return point ? (
                    <Marker key={`b-m-${zone.id}`} position={point} eventHandlers={{ click: () => setSelectedZoneId(zone.id) }}>
                      <Popup>{zone.name}</Popup>
                    </Marker>
                  ) : null;
                })}
              </>
            </LayersControl.Overlay>
          )}

          {layerVisibility.overlap && twinA && twinB && (
            <LayersControl.Overlay checked name="Twin overlap">
              <>
                {twinA.rankedZones
                  .filter((zone) => overlapIds.has(zone.id))
                  .map((zone) => {
                    const polygon = asLatLngs(zone);
                    if (!polygon) {
                      return null;
                    }
                    return (
                      <Polygon
                        key={`overlap-${zone.id}`}
                        positions={polygon}
                        pathOptions={{ color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.2 }}
                      />
                    );
                  })}
              </>
            </LayersControl.Overlay>
          )}

          {layerVisibility.conflict && twinA && twinB && (
            <LayersControl.Overlay checked name="Twin conflict">
              <>
                {caseRecord.candidateZones
                  .filter((zone) => conflictIds.has(zone.id))
                  .map((zone) => {
                    const polygon = asLatLngs(zone);
                    if (!polygon) {
                      return null;
                    }
                    return (
                      <Polygon
                        key={`conflict-${zone.id}`}
                        positions={polygon}
                        pathOptions={{ color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.17 }}
                      />
                    );
                  })}
              </>
            </LayersControl.Overlay>
          )}

          {layerVisibility.heatmap && (
            <LayersControl.Overlay checked name="Spatial probability heatmap">
              <>
                {(twinB?.rankedZones ?? twinA?.rankedZones ?? caseRecord.candidateZones).map((zone) => {
                  const point = markerPoint(zone);
                  if (!point) {
                    return null;
                  }
                  return (
                    <Circle
                      key={`heat-${zone.id}`}
                      center={point}
                      radius={400 + zone.priorWeight * 1800}
                      pathOptions={{
                        color: '#0ea5e9',
                        fillColor: '#38bdf8',
                        fillOpacity: Math.min(0.55, 0.08 + zone.priorWeight * 0.6),
                      }}
                    />
                  );
                })}
              </>
            </LayersControl.Overlay>
          )}
        </LayersControl>
      </MapContainer>
      {selectedZone && (
        <div className="text-sm border border-slate-300 rounded bg-white p-2">
          <div className="font-semibold">Selected zone: {selectedZone.name}</div>
          <div>Type: {selectedZone.zoneType}</div>
          <div>Supporting evidence: {selectedZone.supportingEvidenceIds.join(', ') || 'none'}</div>
          <div>Contradicting evidence: {selectedZone.contradictingEvidenceIds.join(', ') || 'none'}</div>
          <div>Assumptions: {selectedZone.assumptions.join(' | ') || 'none'}</div>
          <div>Score: {selectedZone.priorWeight.toFixed(3)}</div>
          <div>
            Uncertainty interval: [{selectedZone.uncertainty[0].toFixed(2)}, {selectedZone.uncertainty[1].toFixed(2)}]
          </div>
        </div>
      )}
    </section>
  );
}
