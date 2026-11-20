import {distanceKm} from './distance.js';

// Use the original order to break ties. Coordinates remain in the browser.
export function sortVisitedByDistance(places, latitude, longitude) {
 return places.map((place,index)=>({...place,index,distance:distanceKm(latitude,longitude,place.latitude,place.longitude)}))
  .sort((a,b)=>a.distance-b.distance||a.index-b.index);
}
