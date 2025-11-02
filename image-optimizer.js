const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'assets';
const outputDir = 'assets/optimized';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Optimization profiles
const profiles = {
  icons: {
    quality: 85,  // Slightly reduced for better compression
    compression: 'png',
    speed: 1,
    fit: 'contain'
  },
  photos: {
    quality: 75,  // Better balance for photos
    compression: 'jpeg',
    progressive: true
  }
};

const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
};

const processImages = async () => {
  const files = fs.readdirSync(inputDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    const originalSize = getFileSize(inputPath);
    
    const profile = file.match(/(icon|logo)/i) 
      ? profiles.icons 
      : profiles.photos;

    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      if (!['png', 'jpeg'].includes(metadata.format)) {
        console.warn(`Skipping ${file} (unsupported format)`);
        continue;
      }

      await image
        .resize({
          width: 1024,
          height: 1024,
          fit: profile.fit,
          withoutEnlargement: true
        })
        .toFormat(profile.compression === 'png' ? 'png' : 'jpeg', {
          quality: profile.quality,
          progressive: profile.progressive,
          compressionLevel: profile.speed
        })
        .toFile(outputPath);

      const optimizedSize = getFileSize(outputPath);
      const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      console.log(`${file}: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${reduction}% reduction)`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }
};

// Skip in production unless explicitly run
if (process.env.NODE_ENV !== 'production' || process.argv.includes('--force-optimize')) {
  processImages();
} else {
  console.log('Image optimization skipped in production');
}