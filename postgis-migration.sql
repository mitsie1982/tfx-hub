-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a geography column to Profile
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS location_geog geography(Point, 4326);

-- Backfill geography column from lat/lon
UPDATE "Profile"
SET location_geog = ST_SetSRID(ST_MakePoint(location_lon, location_lat), 4326)
WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;

-- Example: Find nearest contractors within 3km (kNN)
-- Replace :lat, :lon, :radius_m, :limit as needed
SELECT *,
  ST_Distance(location_geog, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) AS distance_m
FROM "Profile"
WHERE role = 'contractor'
  AND location_geog IS NOT NULL
  AND ST_DWithin(location_geog, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :radius_m)
ORDER BY location_geog <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
LIMIT :limit;
