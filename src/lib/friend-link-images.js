// Self-hosted identifying badges for legacy friend-link images.
// Keep source WordPress export and translator data untouched; only rewrite image src at render time.
export const FRIEND_LINK_IMAGE_MAP = Object.freeze({
  "https://xingbianren.cn/zb_users/upload/2023/05/202305231684818664504571.png": "/images/friend-links/xingbianren.svg",
  "https://2cat.net/wp-content/uploads/2024/01/3106F9BE-8044-4999-8E08-F152E0F6B240-150x150.jpeg": "/images/friend-links/2cat.svg",
  "https://srebro.cn/themes/theme-hao/assets/images/hao-logo.jpg": "/images/friend-links/srebro.svg",
  "https://cdn.dbkuaizi.com/static/image/avatar.jpg": "/images/friend-links/dbkuaizi.svg",
  "https://cravatar.cn/avatar/05adf5179ce2ed8b675ce0949495b621": "/images/friend-links/yanqingshan.svg",
  "https://9sb.net/logo.svg": "/images/friend-links/9sb.svg",
  "https://gravatar.loli.net/avatar/459a0b9f775f791d461b06612198e200?s=150": "/images/friend-links/dazhu1988.svg",
  "https://blog.moraxyc.com/avatar.png": "/images/friend-links/moraxyc.svg",
});

export function localizeFriendLinkImages(html) {
  return html.replace(/<img\b[^>]*>/gi, tag => tag.replace(/(\bsrc\s*=\s*)(["'])(.*?)\2/i, (original, prefix, quote, url) => {
    const local = FRIEND_LINK_IMAGE_MAP[url];
    return local ? `${prefix}${quote}${local}${quote}` : original;
  }));
}
