import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pf_meta':'application/octet-stream','.pf_index':'application/octet-stream','.pf_fragment':'application/octet-stream'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4177');let pathname=decodeURIComponent(url.pathname);let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw new Error('invalid path');
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html')}catch{if(!extname(file))file=resolve(file,'index.html')}
  let data;try{data=await readFile(file)}catch{res.statusCode=404;file=resolve(root,'404.html');data=await readFile(file)}
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.statusCode=400;res.end('Bad request')}
}).listen(4177,'127.0.0.1');
