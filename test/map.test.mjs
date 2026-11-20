import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));const data=read('../migration/article-locations.json'),posts=read('../migration/published-posts.json');
test('map references existing published articles and valid coordinates',()=>{const ids=new Set(posts.map(x=>x.id));for(const p of data.locations){assert.ok(p.latitude>=-90&&p.latitude<=90&&p.longitude>=-180&&p.longitude<=180);assert.ok(p.articleIds.length);for(const id of p.articleIds)assert.ok(ids.has(id),`missing post ${id}`)}const placed=data.locations.flatMap(x=>x.articleIds);assert.equal(new Set(placed).size,placed.length);assert.deepEqual([...placed,...data.unlocatedArticleIds].sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));for(const p of data.visitedPlaces)assert.ok(p.latitude>=-90&&p.latitude<=90&&p.longitude>=-180&&p.longitude<=180);assert.equal(data.currentLocation.names.zh,'深圳·龙华·油松')});
test('distance is a local approximate great-circle calculation',async()=>{const {distanceKm}=await import('../src/lib/distance.js');assert.equal(distanceKm(22.5431,114.0579,22.5431,114.0579),0);const distance=distanceKm(39.9042,116.4074,22.5431,114.0579);assert.ok(distance>1900&&distance<2100);assert.ok(Number.isFinite(distanceKm(0,0,0,180)))});

test('visited cities are sorted by visitor distance with stable ties',async()=>{
 const {sortVisitedByDistance}=await import('../src/lib/visited-distance.js');
 const cities=[{id:'far',latitude:40,longitude:116},{id:'near',latitude:22.64,longitude:114.04},{id:'tie',latitude:22.64,longitude:114.04}];
 const sorted=sortVisitedByDistance(cities,22.64,114.04);assert.deepEqual(sorted.map(x=>x.id),['near','tie','far']);assert.equal(sorted[0].distance,0);assert.deepEqual(cities.map(x=>x.id),['far','near','tie']);
});
test('Yuci and Lüliang have visited boundaries',()=>{const boundaries=read('../public/map/visited-regions.geojson');for(const name of ['Yucishi','吕梁市'])assert.ok(boundaries.features.some(f=>f.properties.name===name),name);for(const id of ['yuci','lvliang','shenzhen'])assert.ok(data.visitedPlaces.some(p=>p.id===id),id)});
