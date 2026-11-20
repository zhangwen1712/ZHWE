import {localeData} from './locale-data.js';
const data=localeData.en;
const posts=data['published-posts'],pages=data['published-pages'],categories=data.categories,tags=data.tags;
export const getStaticPaths = () => {
 const pathOf=(url)=>decodeURIComponent(new URL(url).pathname).replace(/^\/+|\/+$/g,'');

 const entries=[...posts.map(item=>({params:{path:pathOf(item.link)},props:{kind:'post',item}})),...pages.map(item=>({params:{path:pathOf(item.link)},props:{kind:'page',item}}))];
 const archives=[...categories.map(term=>({params:{path:pathOf(term.link)},props:{kind:'category',term}})),...tags.map(term=>({params:{path:pathOf(term.link)},props:{kind:'tag',term}}))];
 const pagination=Array.from({length:Math.ceil(posts.length/10)-1},(_,i)=>({params:{path:`page/${i+2}`},props:{kind:'pagination',page:i+2}}));
 const seen=new Set();return [...entries,...archives,...pagination].map(x=>({...x,props:{...x.props,lang:'en',localizedPosts:posts,localizedCategories:categories,localizedComments:data.comments,timeline:data.milestones}})).filter(x=>{if(!x.params.path||seen.has(x.params.path))return false;seen.add(x.params.path);return true;});
};
