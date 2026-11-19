// Great-circle distance between two points, in kilometres.
export function distanceKm(latitudeA,longitudeA,latitudeB,longitudeB){
 const rad=n=>n*Math.PI/180,lat1=rad(latitudeA),lat2=rad(latitudeB),dlat=lat2-lat1,dlon=rad(longitudeB-longitudeA);
 const a=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
 const bounded=Math.min(1,Math.max(0,a));
 return 6371*2*Math.atan2(Math.sqrt(bounded),Math.sqrt(1-bounded));
}
