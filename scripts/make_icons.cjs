const Jimp = require('jimp');
async function main() {
  const srcPath = process.argv[2] || 'public/Icone.png';
  const src = await Jimp.read(srcPath);
  for (const [size, dest] of [[192,'public/icon-192.png'],[512,'public/icon-512.png'],[180,'public/apple-touch-icon.png']]) {
    const canvas = new Jimp(size, size, 0xffffffff);
    const r = Math.min(size/src.bitmap.width, size/src.bitmap.height);
    const w = Math.round(src.bitmap.width*r), h = Math.round(src.bitmap.height*r);
    canvas.composite(src.clone().resize(w,h), (size-w)/2,(size-h)/2);
    await canvas.writeAsync(dest);
    console.log(dest,'OK');
  }
  const W=750,H=1334;
  const splash = new Jimp(W,H,0xffffffff);
  const tw = Math.round(W*0.52), th = Math.round(src.bitmap.height*(tw/src.bitmap.width));
  splash.composite(src.clone().resize(tw,th), (W-tw)/2, (H-th)/2 - 20);
  await splash.writeAsync('public/apple-splash-750x1334.png');
  console.log('apple-splash OK');
}
main();
