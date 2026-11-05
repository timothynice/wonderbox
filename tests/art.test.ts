import { describe, expect, it } from 'vitest';
import { entityInk, worldArt } from '../src/game/art';
describe('original procedural appearance rendering', () => {
  it('preserves original art and changes only the requested custom color family', () => {
    const original=entityInk({kind:'player',appearance:{palette:'original'}});
    expect(original(0xb9ddbd)).toBe(0xb9ddbd);
    const custom=entityInk({kind:'player',appearance:{palette:'original',primaryColor:'#123456'}});
    expect(custom(0xb9ddbd)).not.toBe(0xb9ddbd);
    expect(custom(0xe5989c)).toBe(0xe5989c); // scarf stays authored original unless accent is requested
    expect(custom(0x173f43)).toBe(0x173f43); // face readability is never recolored
    const accent=entityInk({kind:'player',appearance:{palette:'original',accentColor:'#fedcba'}});
    expect(accent(0xb9ddbd)).toBe(0xb9ddbd);
    expect(accent(0xe5989c)).toBe(0xfedcba);
  });
  it('provides distinct day/night art directions and safely falls back to the original garden', () => {
    const themes=['garden','autumn','candy','aurora'];
    expect(new Set(themes.map(theme=>worldArt(theme,false).sky)).size).toBe(4);
    for(const theme of themes)expect(worldArt(theme,false).sky).not.toBe(worldArt(theme,true).sky);
    expect(worldArt(undefined,false)).toEqual(worldArt('garden',false));
    expect(worldArt('unknown',true)).toEqual(worldArt('garden',true));
  });
});
