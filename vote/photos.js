// Which real photo is behind each vote page's numbers, so Top picks can pool every vote on the same
// photo across pages (e.g. DC 141 is dc-001, movement-003 and in the All cities vote).
//
// Keys are "<City> <file number>". Each album lists its photos in id order: the 1st key is <album>-001,
// the 2nd <album>-002, ... Only ever APPEND to a list — reordering would reassign past votes.
(function () {
  const C = { DC: 'Washington, DC', SF: 'San Francisco', NYC: 'New York', BER: 'Berlin', MTL: 'Montréal' };
  const P = {};   // key → { city, src, file }
  const add = (key, city, src, file) => { if (!P[key]) P[key] = { city, src, file }; };

  const DC = ['141', '151', '138', '143', '97', '88', '147', '170', '34', '162', '179', '207'];
  DC.forEach((n, i) => add(`DC ${n}`, C.DC, `/vote/dc/p/dc-${String(i + 1).padStart(3, '0')}.webp`, `${n}-AItreatyDemo-111426-.jpg`));

  const SF = ['1945', '1428', '1469', '1476', '2244', '1657', '2080', '2122', '1447', '2142', '1141', '1939',
              '1629', '2106', '1271', '1920', '1907', '1971'];   // 13–16 and 18 vertical, 17 horizontal
  SF.forEach((n, i) => add(`SF ${n}`, C.SF, `/vote/sf/p/sf2-${String(i + 1).padStart(3, '0')}.webp`, `0G6A${n}.jpg`));

  const NYC = ['4618', '4890', '4979', '5092', '5214', '5227', '5536', '5592', '4787', '4971'];
  NYC.forEach((n, i) => add(`NYC ${n}`, C.NYC, `/vote/nyc/p/nyc-${String(i + 1).padStart(3, '0')}.webp`, `_MG_${n}.jpg`));

  const MTL = ['11', '13', '15', '16', '17', '18', '19', '23', '24', '28', '34', '35'];
  MTL.forEach((n, i) => add(`Montréal ${n}`, C.MTL, `/vote/mtl/p/mtl-${String(i + 1).padStart(3, '0')}.webp`, `Manif_PauseAI_14nov_creditClaraLacasse-${n}.jpg`));

  add('Berlin 010', C.BER, '/vote/movement/p/movement-006.webp', 'berlin-ai-treaty-march-2026-11-14-010.jpg');
  add('Montréal 24', C.MTL, '/vote/movement/p/movement-007.webp', 'Manif_PauseAI_14nov_creditClaraLacasse-24.jpg');
  add('Montréal 28', C.MTL, '/vote/movement/p/movement-008.webp', 'Manif_PauseAI_14nov_creditClaraLacasse-28.jpg');

  const ALBUMS = {
    dc: DC.map(n => `DC ${n}`),
    sf2: SF.map(n => `SF ${n}`),
    nyc: NYC.map(n => `NYC ${n}`),
    mtl: MTL.map(n => `Montréal ${n}`),
    movement: ['SF 2080', 'SF 2142', 'DC 141', 'DC 143', 'DC 151', 'Berlin 010', 'Montréal 24', 'Montréal 28', 'DC 170', 'SF 1945'],
    // All cities: every city photo except New York. Append new photos at the end.
    // Frozen order: each block is sliced to the photos it had when added, new photos go at the end.
    all: [...DC.slice(0, 12).map(n => `DC ${n}`), ...SF.slice(0, 12).map(n => `SF ${n}`), 'Berlin 010', 'Montréal 24', 'Montréal 28',
          ...MTL.slice(0, 12).filter(n => n !== '24' && n !== '28').map(n => `Montréal ${n}`),
          ...SF.slice(12, 17).map(n => `SF ${n}`), ...SF.slice(17, 18).map(n => `SF ${n}`)],
  };

  window.PHOTOS = P;
  window.PHOTO_ALBUMS_KEYS = ALBUMS;
  // album id like "dc-003" → photo key like "DC 138"
  window.photoKey = (album, id) => {
    const i = +String(id).split('-').pop() - 1;
    return (ALBUMS[album] || [])[i] || null;
  };
})();
