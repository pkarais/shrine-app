/**
 * GPS Logic for clocking in.
 */
import { GEOFENCE } from "@/constants"

export function getSiteLocation() {
  return GEOFENCE.LIBERTY_PARK
}

export const checkGeofence = (
  userLat: number, 
  userLon: number, 
  targetLat: number, 
  targetLon: number, 
  radiusMeters: number = 100
) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (targetLat * Math.PI) / 180;
  const Δφ = ((targetLat - userLat) * Math.PI) / 180;
  const Δλ = ((targetLon - userLon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return {
    inRange: distance <= radiusMeters,
    distance,
  };
};
