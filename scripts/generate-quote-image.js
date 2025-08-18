#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check for required dependencies and install if missing
async function ensureDependencies() {
    const requiredPackages = [
        'canvas',
        'sharp'
    ];
    
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
        try {
            require.resolve(pkg);
        } catch (e) {
            missingPackages.push(pkg);
        }
    }
    
    if (missingPackages.length > 0) {
        console.log(`Installing missing dependencies: ${missingPackages.join(', ')}`);
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const npm = spawn('npm', ['install', ...missingPackages], { 
                stdio: 'inherit',
                shell: true 
            });
            
            npm.on('close', (code) => {
                if (code === 0) {
                    console.log('Dependencies installed successfully!');
                    resolve();
                } else {
                    reject(new Error(`npm install failed with code ${code}`));
                }
            });
        });
    }
}

async function generateQuoteImage(quoteId, outputPath = null) {
    // Ensure dependencies are installed
    await ensureDependencies();
    
    // Now require the dependencies
    const { createCanvas, loadImage, registerFont } = require('canvas');
    const sharp = require('sharp');
    
    // Load quotes data
    const dataPath = path.join(__dirname, '..', 'data.json'); // already correct, but double-check
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found: ${dataPath}`);
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Find quote by ID, or fallback to 1-based index if IDs are missing
    let quote = data.quotes.find(q => q.id == quoteId);
    if (!quote) {
        const idx = Number(quoteId) - 1;
        if (idx >= 0 && idx < data.quotes.length) {
            quote = data.quotes[idx];
        }
    }
    if (!quote) {
        throw new Error(`Quote with ID or index ${quoteId} not found`);
    }
    
    console.log(`Generating image for quote #${quoteId}: "${quote.text}"`);
    
    // Canvas dimensions (square format for Instagram/social media)
    const width = 1000;
    const height = 1000;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background color (beige from CSS: #f5f5dc)
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, width, height);

    // Card background (floral white: #fffaf0)
    const cardMargin = 70;
    const cardX = cardMargin;
    const cardY = cardMargin;
    const cardWidth = width - cardMargin * 2;
    const cardHeight = height - cardMargin * 2;
    

    // Draw card with reduced corner radius (no shadow)
    const cardRadius = 24;
    ctx.fillStyle = '#fffaf0';
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(cardX + cardRadius, cardY);
        ctx.lineTo(cardX + cardWidth - cardRadius, cardY);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + cardRadius);
        ctx.lineTo(cardX + cardWidth, cardY + cardHeight - cardRadius);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - cardRadius, cardY + cardHeight);
        ctx.lineTo(cardX + cardRadius, cardY + cardHeight);
        ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cardRadius);
        ctx.lineTo(cardX, cardY + cardRadius);
        ctx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
        ctx.closePath();
        ctx.fill();
    }

    // Border (gilded: #cdaa7d)
    ctx.strokeStyle = '#cdaa7d';
    ctx.lineWidth = 4;
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(cardX + cardRadius, cardY);
        ctx.lineTo(cardX + cardWidth - cardRadius, cardY);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + cardRadius);
        ctx.lineTo(cardX + cardWidth, cardY + cardHeight - cardRadius);
        ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - cardRadius, cardY + cardHeight);
        ctx.lineTo(cardX + cardRadius, cardY + cardHeight);
        ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cardRadius);
        ctx.lineTo(cardX, cardY + cardRadius);
        ctx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Load and draw Statham image
    try {
    // Correct path: up one to statham/, then staham.jpeg
    const stathamImagePath = path.join(__dirname, '..', 'staham_320.jpg');
        if (fs.existsSync(stathamImagePath)) {
            const stathamImg = await loadImage(stathamImagePath);
            // Calculate image size and position (circular crop)
            const imgSize = 180;
            const imgX = cardX + (cardWidth - imgSize) / 2;
            const imgY = cardY + 40;
            // Save context for clipping
            ctx.save();
            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(imgX + imgSize/2, imgY + imgSize/2, imgSize/2, 0, Math.PI * 2);
            ctx.clip();
            // Draw image
            ctx.drawImage(stathamImg, imgX, imgY, imgSize, imgSize);
            // Restore context
            ctx.restore();
            // Draw border around circular image
            ctx.strokeStyle = '#cdaa7d';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(imgX + imgSize/2, imgY + imgSize/2, imgSize/2, 0, Math.PI * 2);
            ctx.stroke();
        }
    } catch (e) {
        console.warn('Could not load Statham image:', e.message);
    }
    
    // Text styling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Quote text
    const quoteText = `"${quote.text}"`;
    const maxQuoteWidth = cardWidth - 100;

    // Calculate font size based on text length
    let quoteFontSize = 48;
    if (quoteText.length > 80) quoteFontSize = 40;
    if (quoteText.length > 120) quoteFontSize = 32;
    if (quoteText.length > 160) quoteFontSize = 28;
    if (quoteText.length > 200) quoteFontSize = 24;

    ctx.font = `italic ${quoteFontSize}px serif`;
    ctx.fillStyle = '#3a2d2d';

    // Word wrap for quote text
    const words = quoteText.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxQuoteWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    // --- Center quote in free area under image ---
    // Image area: imgY + imgSize (bottom of image)
    const imgSize = 180;
    const imgY = cardY + 40;
    const freeTop = imgY + imgSize + 40; // 40px padding below image
    const freeBottom = cardY + cardHeight - 100; // leave space for author and id
    const freeHeight = freeBottom - freeTop;
    const lineHeight = quoteFontSize * 1.3;
    const totalTextHeight = lines.length * lineHeight;
    let startY = freeTop + (freeHeight - totalTextHeight) / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
    }
    
    // Author text
    const authorText = `— ${data.author}`;
    ctx.font = 'bold 36px serif';
    ctx.fillStyle = '#8b4513'; // Saddle brown
    ctx.fillText(authorText, width / 2, startY + totalTextHeight + 60);

    // Watermark (bottom left)
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#bbb';
    ctx.textAlign = 'left';
    ctx.fillText('https://gritsenko.biz/statham/', 40, height - 40);

    // Quote ID (small, bottom right)
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText(`#${quoteId}`, width - 40, height - 40);
    
    // Generate output filename if not provided
    if (!outputPath) {
        outputPath = path.join(__dirname, '..', `og-cache/og-${quoteId}.jpg`);
    } else {
        // Force .jpg extension
        outputPath = outputPath.replace(/\.(png|jpeg)$/i, '.jpg');
        if (!outputPath.toLowerCase().endsWith('.jpg')) {
            outputPath += '.jpg';
        }
    }

    // Save canvas as PNG buffer (canvas only outputs PNG)
    const buffer = canvas.toBuffer('image/png');

    // Always output as JPEG
    await sharp(buffer)
        .jpeg({ quality: 60 })
        .toFile(outputPath);

    console.log(`Image saved to: ${outputPath}`);
    return outputPath;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node generate-quote-image.js <quoteId> [outputPath]');
        console.log('Example: node generate-quote-image.js 1');
        console.log('Example: node generate-quote-image.js 1 ./my-quote.png');
        process.exit(1);
    }
    
    const quoteId = parseInt(args[0]);
    const outputPath = args[1];
    
    if (isNaN(quoteId) || quoteId < 1) {
        console.error('Error: quoteId must be a positive number');
        process.exit(1);
    }
    
    generateQuoteImage(quoteId, outputPath)
        .then(path => {
            console.log('✅ Quote image generated successfully!');
        })
        .catch(error => {
            console.error('❌ Error generating quote image:', error.message);
            process.exit(1);
        });
}

module.exports = { generateQuoteImage };
