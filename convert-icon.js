const fs = require('fs');
const svg2img = require('svg2img');

// Read the SVG file
const svgContent = fs.readFileSync('./assets/icon.svg', 'utf8');

// Convert SVG to PNG
svg2img(svgContent, { width: 128, height: 128, format: 'png' }, (error, buffer) => {
    if (error) {
        console.error('Error converting SVG to PNG:', error);
        return;
    }
    
    // Write the PNG file
    fs.writeFileSync('./assets/icon.png', buffer);
    console.log('Successfully converted SVG to PNG: assets/icon.png');
});
