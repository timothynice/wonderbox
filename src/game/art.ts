/** Original, curated vector art direction. Color and ornament never affect collision. */
export type ArtPalette = { primary: number; light: number; dark: number; accent: number; accentLight: number };
const palettes: Record<string, ArtPalette> = {
  mint: {primary:0x75c6aa,light:0xc5eed2,dark:0x337d76,accent:0xf3b2ad,accentLight:0xffdfbf},
  lavender: {primary:0xa594d5,light:0xe0cff5,dark:0x655184,accent:0xf2c693,accentLight:0xffe8ba},
  coral: {primary:0xe58f91,light:0xffcec2,dark:0x9d566e,accent:0x94d4c1,accentLight:0xd0efe1},
  gold: {primary:0xe7bc69,light:0xffe6a8,dark:0x9a7850,accent:0xb8a3dd,accentLight:0xe3d5f3},
  sky: {primary:0x83b9d7,light:0xd2e7f3,dark:0x497c9c,accent:0xf1b5d1,accentLight:0xfbe1ec},
};
export function blendColor(a:number,b:number,amount:number) {
  const channel=(shift:number)=>Math.round(((a>>shift)&255)*(1-amount)+((b>>shift)&255)*amount);
  return (channel(16)<<16)|(channel(8)<<8)|channel(0);
}
const identityInk = (color:number)=>color;
const inkCache = new Map<string,(color:number)=>number>();
export function entityInk(entity: {kind:string;appearance?:{palette?:string;primaryColor?:string|null;accentColor?:string|null}}) {
  const appearance=entity.appearance;
  const paletteName=appearance?.palette??'original';
  if(!appearance || (paletteName==='original' && !appearance.primaryColor && !appearance.accentColor))return identityInk;
  const key=`${entity.kind}:${paletteName}:${appearance.primaryColor}:${appearance.accentColor}`;
  const cached=inkCache.get(key);if(cached)return cached;
  const original = entity.kind==='enemy' ? palettes.lavender : entity.kind==='star'||entity.kind==='lantern' ? palettes.gold : palettes.mint;
  const palette = {...(palettes[paletteName] ?? original)};
  if(appearance.primaryColor) {
    palette.primary=parseInt(appearance.primaryColor.slice(1),16);
    palette.light=blendColor(palette.primary,0xfff5dd,.5);
    palette.dark=blendColor(palette.primary,0x20303d,.48);
  }
  if(appearance.accentColor) {
    palette.accent=parseInt(appearance.accentColor.slice(1),16);
    palette.accentLight=blendColor(palette.accent,0xfff5dd,.5);
  }
  const colors = new Map<number,number>([
    ...[0xb9ddbd,0xaca0b9,0x8fbd82,0x8eb896,0x87b6a6,0x92ae8e,0xdec998,0xffe4a4].map(c=>[c,palette.light] as [number,number]),
    ...[0x73bda5,0x8bb89f,0x89749d,0xaf91ca,0x73ac7b,0x78a388,0x88d4a7,0x95bdab,0x97b2a4,0x9ab496].map(c=>[c,palette.primary] as [number,number]),
    ...[0x1f696d,0x4a3d68,0x3a5f60,0x546b62,0x597c6c,0x8b7663,0xc3a77c,0x4b836b,0x51736c,0x587c72].map(c=>[c,palette.dark] as [number,number]),
    ...[0xe5989c,0xe6a4a8,0xc39fac,0xca99b5,0xf4c587,0xd99582,0xe3b1cf,0xd7abc1,0xc7b69f].map(c=>[c,palette.accent] as [number,number]),
    ...[0xffdfeb,0xffe7a0,0xffdfaa,0xedd8a2,0xe9db9b,0xffe6a1,0xffe9ad,0xffe5a9,0xffdfa1,0xecdca0,0xffdc89,0xffdf91,0xadcbb2].map(c=>[c,palette.accentLight] as [number,number]),
  ]);
  const primarySources = new Set([0xb9ddbd,0xaca0b9,0x8fbd82,0x8eb896,0x87b6a6,0x92ae8e,0xdec998,0xffe4a4,0x73bda5,0x8bb89f,0x89749d,0xaf91ca,0x73ac7b,0x78a388,0x88d4a7,0x95bdab,0x97b2a4,0x9ab496,0x1f696d,0x4a3d68,0x3a5f60,0x546b62,0x597c6c,0x8b7663,0xc3a77c,0x4b836b,0x51736c,0x587c72]);
  const primaryEnabled=paletteName!=='original'||Boolean(appearance.primaryColor);
  const accentEnabled=paletteName!=='original'||Boolean(appearance.accentColor);
  const ink=(color:number)=> (primarySources.has(color)?primaryEnabled:accentEnabled) ? colors.get(color)??color : color;
  // Bounded cache avoids reconstructing color tables for every sprite on every frame.
  if(inkCache.size>=256)inkCache.delete(inkCache.keys().next().value!);
  inkCache.set(key,ink);
  return ink;
}
export type WorldArt = {sky:number;skyBand:number;celestial:number;moonShade:number;mountains:number[];path:number;ground:number;soil:number;surface:number;shine:number;stem:number;leaf:number;flower:number;glow:number};
const worldCache = new Map<string,WorldArt>();
export function worldArt(theme:string|undefined,moon:boolean):WorldArt {
  const name=['garden','autumn','candy','aurora'].includes(theme??'')?theme!:'garden';
  const key=`${name}:${moon}`;const cached=worldCache.get(key);if(cached)return cached;
  const themes:Record<string,WorldArt>={
    garden:{sky:moon?0x142e43:0x9ac7b3,skyBand:moon?0x213d51:0xd7dec1,celestial:moon?0xe9f4d3:0xffecbc,moonShade:0x244557,mountains:moon?[0x274d58,0x25515b,0x265b5b]:[0x7da99b,0x659c8b,0x4e8c7d],path:moon?0x426e6a:0x9cbea0,ground:0x263d43,soil:0x385554,surface:0x75a58c,shine:0xa8c9a1,stem:0x729d75,leaf:0x6fa186,flower:0xd7a4bc,glow:0xe8edaf},
    autumn:{sky:moon?0x302b48:0xe8bb98,skyBand:moon?0x5a3856:0xffe4b8,celestial:0xffe3ae,moonShade:0x493348,mountains:moon?[0x5f3e54,0x754958,0x805445]:[0xc89778,0xb38162,0x966f53],path:moon?0x8c695d:0xe0bb8e,ground:0x4b3b3e,soil:0x64504a,surface:0xc69a64,shine:0xf4cc8d,stem:0x9d9362,leaf:0xd49b69,flower:0xe6b17c,glow:0xffcb82},
    candy:{sky:moon?0x352e57:0xd9b6d5,skyBand:moon?0x6d4674:0xffe3da,celestial:0xffe3bc,moonShade:0x52416a,mountains:moon?[0x58446e,0x66547f,0x796086]:[0xb39ac9,0x9f8bb7,0x907daa],path:moon?0x866a98:0xe6c1db,ground:0x514259,soil:0x715c70,surface:0xc499b8,shine:0xf9d7df,stem:0x8fb8aa,leaf:0x9fc7b6,flower:0xf5c8d0,glow:0xf8d7a8},
    aurora:{sky:moon?0x122d40:0x99c7cf,skyBand:moon?0x254e63:0xd7e7d9,celestial:0xe1f7e6,moonShade:0x23475b,mountains:moon?[0x244b62,0x286171,0x347f7b]:[0x7da8b6,0x699aa7,0x508f93],path:moon?0x438f8b:0xa2c6bd,ground:0x273e51,soil:0x365866,surface:0x76bfc0,shine:0xc6eee1,stem:0x82c5b3,leaf:0x7dbaae,flower:0xc3b6e8,glow:0xa6f3df},
  };
  const result=themes[name];worldCache.set(key,result);return result;
}
