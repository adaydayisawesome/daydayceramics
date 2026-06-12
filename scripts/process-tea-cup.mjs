import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = process.argv[2] || path.join(root, "public/images/tea-cup-source.png");
const output = path.join(root, "public/images/tea-cup-bw.png");

const image = sharp(source);
const { width, height } = await image.metadata();

const cropWidth = Math.round(width * 0.38);
const cropHeight = Math.round(height * 0.56);
const left = Math.round((width - cropWidth) / 2);
const top = Math.round((height - cropHeight) / 2);

const { data, info } = await image
  .extract({ left, top, width: cropWidth, height: cropHeight })
  .grayscale()
  .normalize()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(info.width * info.height * 4);

for (let i = 0; i < info.width * info.height; i++) {
  const gray = data[i];
  rgba[i * 4] = gray;
  rgba[i * 4 + 1] = gray;
  rgba[i * 4 + 2] = gray;
  rgba[i * 4 + 3] = gray < 55 ? 0 : Math.min(255, Math.round((gray - 55) * 2.8));
}

await sharp(rgba, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim()
  .png()
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`Wrote ${output} (${meta.width}x${meta.height})`);
