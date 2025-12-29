// svgToJpg.js
// Usage: node svgToJpg.js input.svg

const sharp = require('sharp');
const path = require('path');

/**
 * Converts an SVG file to a JPG file with the same base name.
 * @param {string} svgPath - Path to the input SVG file.
 * @param {number} [quality=90] - JPEG quality (1-100).
 * @returns {Promise<string>} - Resolves to the output JPG file path.
 */
async function convertSvgToJpg(svgPath, quality = 90) {
  if (!svgPath || typeof svgPath !== 'string') {
    throw new Error('Input SVG path must be a string');
  }
  const ext = path.extname(svgPath);
  if (ext.toLowerCase() !== '.svg') {
    throw new Error('Input file must have .svg extension');
  }
  const baseName = path.basename(svgPath, '.svg');
  const dir = path.dirname(svgPath);
  const jpgPath = path.join(dir, baseName + '.jpg');

  await sharp(svgPath)
    .jpeg({ quality })
    .toFile(jpgPath);
  return jpgPath;
}

// If run as a script: node svgToJpg.js input.svg
if (require.main === module) {
  const [,, inputSvg] = process.argv;
  if (!inputSvg) {
    console.error('Usage: node svgToJpg.js <input.svg>');
    process.exit(1);
  }
  convertSvgToJpg(inputSvg)
    .then(jpgPath => {
      console.log(`Converted ${inputSvg} to ${jpgPath}`);
    })
    .catch(err => {
      console.error('Error converting SVG to JPG:', err);
      process.exit(2);
    });
}

module.exports = convertSvgToJpg;