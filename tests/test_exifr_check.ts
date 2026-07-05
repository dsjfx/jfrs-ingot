import exifr from 'exifr';
console.log(typeof exifr.parse);
const filePath = '/home/wireman/Photos/1000000675.jpg';

async function getImageDate(filePath: string) {
  const exifData = await exifr.parse(filePath, {
    tiff: true,
    exif: true,
    gps: false,
  });
  console.log(exifData);
}

getImageDate(filePath).catch(console.error);