// Simple kNN/radius matching prototype
function matchProfessionals(professionals, location, radiusKm) {
  // professionals: [{id, name, lat, lon, ...}]
  // location: {lat, lon}
  // radiusKm: number
  return professionals.filter((p) => {
    const d = haversine(location, { lat: p.lat, lon: p.lon });
    return d <= radiusKm;
  });
}

function haversine(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const aVal = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aVal));
}

module.exports = { matchProfessionals };
