import posts from '../migration/published-posts.json' with { type: 'json' };
import pages from '../migration/published-pages.json' with { type: 'json' };
import categories from '../migration/categories.json' with { type: 'json' };
import tags from '../migration/tags.json' with { type: 'json' };
export const getStaticPaths = () => {
 const pathOf=(url)=>decodeURIComponent(new URL(url).pathname).replace(/^\/+|\/+$/g,'');

 const entries=[...posts.map(item=>({params:{path:pathOf(item.link)},props:{kind:'post',item}})),...pages.map(item=>({params:{path:pathOf(item.link)},props:{kind:'page',item}}))];
 const archives=[...categories.map(term=>({params:{path:pathOf(term.link)},props:{kind:'category',term}})),...tags.map(term=>({params:{path:pathOf(term.link)},props:{kind:'tag',term}}))];
 const pagination=Array.from({length:Math.ceil(posts.length/10)-1},(_,i)=>({params:{path:`page/${i+2}`},props:{kind:'pagination',page:i+2}}));
 const seen=new Set();return [...entries,...archives,...pagination].filter(x=>{if(!x.params.path||seen.has(x.params.path))return false;seen.add(x.params.path);return true;});
};
