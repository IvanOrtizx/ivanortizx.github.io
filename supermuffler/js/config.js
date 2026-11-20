// =====================================================================
//  Super Muffler Inc. - site settings
//  Everything the shop may need to change lives here.
// =====================================================================
export const CONFIG = {
  // Google Apps Script web app URL (ends in /exec). Leave empty until the
  // back office is deployed; the form will ask people to call instead.
  formEndpoint: '',

  // Shop time zone and hours (24 h clock). 0 = Sunday ... 6 = Saturday.
  timeZone: 'America/Los_Angeles',
  hours: {
    0: null,
    1: [8, 17],
    2: [8, 17],
    3: [8, 17],
    4: [8, 17],
    5: [8, 15],
    6: null
  },

  // TikTok / Instagram / YouTube videos to show in "Watch the work".
  // Copy the ID from the video link and add a photo to use as cover.
  //   TikTok:    https://www.tiktok.com/@supermuffler/video/7301234567890123456  ->  id: '7301234567890123456'
  //   Instagram: https://www.instagram.com/reel/C1a2B3c4D5e/                     ->  id: 'C1a2B3c4D5e'
  //   YouTube:   https://youtube.com/shorts/AbCdEfGhIjK                          ->  id: 'AbCdEfGhIjK'
  videos: [
    // { platform: 'tiktok', id: '7301234567890123456', poster: 'img/gallery/xpipe-sm.webp', title: { en: 'Custom X-pipe sound check', es: 'Prueba de sonido del X-pipe' } },
  ]
};
