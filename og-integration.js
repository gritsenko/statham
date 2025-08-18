#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { generateQuoteImage } = require('./statham/scripts/generate-quote-image.js');

/**
 * Express.js middleware for dynamic OG image generation
 * Usage: app.get('/og/:quoteId.png', generateOGImage);
 */
async function generateOGImage(req, res, next) {
    try {
        const quoteId = parseInt(req.params.quoteId);
        
        if (isNaN(quoteId) || quoteId < 1) {
            return res.status(400).send('Invalid quote ID');
        }
        
        // Check if image already exists
        const outputDir = path.join(__dirname, 'statham', 'og-cache');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const imagePath = path.join(outputDir, `og-${quoteId}.png`);
        
        // Generate if doesn't exist or is older than 1 day
        const shouldGenerate = !fs.existsSync(imagePath) || 
            (Date.now() - fs.statSync(imagePath).mtime.getTime()) > 24 * 60 * 60 * 1000;
        
        if (shouldGenerate) {
            console.log(`Generating OG image for quote ${quoteId}`);
            await generateQuoteImage(quoteId, imagePath);
        }
        
        // Serve the image
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        res.sendFile(imagePath);
        
    } catch (error) {
        console.error('Error generating OG image:', error);
        res.status(500).send('Error generating image');
    }
}

/**
 * Update HTML meta tags for a specific quote
 */
function updateMetaTags(quoteId, baseUrl = 'https://gritsenko.biz/statham/') {
    try {
        // Load quotes data
        const dataPath = path.join(__dirname, 'statham', 'data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const quote = data.quotes.find(q => q.id == quoteId);
        
        if (!quote) {
            throw new Error(`Quote ${quoteId} not found`);
        }
        
        const description = `"${quote.text}" — ${data.author}`;
        const imageUrl = `${baseUrl}og/${quoteId}.png`;
        const pageUrl = `${baseUrl}?quoteId=${quoteId}`;
        
        return {
            title: 'Цитата Джейсона Стэтхэма на каждый день',
            description: description,
            url: pageUrl,
            image: imageUrl,
            imageAlt: 'Джейсон Стэтхэм',
            imageWidth: 600,
            imageHeight: 600
        };
        
    } catch (error) {
        console.error('Error updating meta tags:', error);
        return null;
    }
}

/**
 * Generate a dynamic HTML page with proper meta tags
 */
async function generateDynamicHTML(quoteId, templatePath = null) {
    const metaData = updateMetaTags(quoteId);
    if (!metaData) {
        throw new Error('Could not generate meta data');
    }
    
    // Read the template HTML
    const htmlPath = templatePath || path.join(__dirname, 'statham', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Update meta tags
    html = html.replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${metaData.description}">`
    );
    
    html = html.replace(
        /<meta name="twitter:description" content="[^"]*">/,
        `<meta name="twitter:description" content="${metaData.description}">`
    );
    
    html = html.replace(
        /<meta property="og:url" content="[^"]*">/,
        `<meta property="og:url" content="${metaData.url}">`
    );
    
    html = html.replace(
        /<meta property="og:image" content="[^"]*">/,
        `<meta property="og:image" content="${metaData.image}">`
    );
    
    html = html.replace(
        /<meta name="twitter:image" content="[^"]*">/,
        `<meta name="twitter:image" content="${metaData.image}">`
    );
    
    html = html.replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${metaData.description}">`
    );
    
    return html;
}

/**
 * CLI tool for generating OG images and updating HTML
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'generate-og':
            const quoteId = parseInt(args[1]);
            if (isNaN(quoteId)) {
                console.error('Usage: node og-integration.js generate-og <quoteId>');
                process.exit(1);
            }
            
            const outputDir = path.join(__dirname, 'statham', 'og-cache');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const imagePath = path.join(outputDir, `og-${quoteId}.png`);
            await generateQuoteImage(quoteId, imagePath);
            console.log(`✅ OG image generated: ${imagePath}`);
            break;
            
        case 'generate-html':
            const htmlQuoteId = parseInt(args[1]);
            const outputHtml = args[2] || `quote-${htmlQuoteId}.html`;
            
            if (isNaN(htmlQuoteId)) {
                console.error('Usage: node og-integration.js generate-html <quoteId> [outputFile]');
                process.exit(1);
            }
            
            const html = await generateDynamicHTML(htmlQuoteId);
            fs.writeFileSync(outputHtml, html);
            console.log(`✅ Dynamic HTML generated: ${outputHtml}`);
            break;
            
        case 'meta-info':
            const metaQuoteId = parseInt(args[1]);
            if (isNaN(metaQuoteId)) {
                console.error('Usage: node og-integration.js meta-info <quoteId>');
                process.exit(1);
            }
            
            const meta = updateMetaTags(metaQuoteId);
            console.log(JSON.stringify(meta, null, 2));
            break;
            
        case 'bulk-og':
            const startId = parseInt(args[1]) || 1;
            const endId = parseInt(args[2]) || 10;
            
            console.log(`Generating OG images for quotes ${startId} to ${endId}...`);
            
            const ogDir = path.join(__dirname, 'statham', 'og-cache');
            if (!fs.existsSync(ogDir)) {
                fs.mkdirSync(ogDir, { recursive: true });
            }
            
            for (let id = startId; id <= endId; id++) {
                try {
                    const ogPath = path.join(ogDir, `og-${id}.png`);
                    await generateQuoteImage(id, ogPath);
                    console.log(`✅ Generated OG image for quote ${id}`);
                } catch (error) {
                    console.error(`❌ Failed to generate OG image for quote ${id}:`, error.message);
                }
            }
            break;
            
        default:
            console.log('Usage: node og-integration.js <command> [args]');
            console.log('');
            console.log('Commands:');
            console.log('  generate-og <quoteId>              Generate OG image for specific quote');
            console.log('  generate-html <quoteId> [output]   Generate HTML with proper meta tags');
            console.log('  meta-info <quoteId>                Show meta tag information');
            console.log('  bulk-og <startId> <endId>          Generate OG images for range');
            console.log('');
            console.log('Examples:');
            console.log('  node og-integration.js generate-og 1');
            console.log('  node og-integration.js generate-html 5 quote-5.html');
            console.log('  node og-integration.js bulk-og 1 20');
    }
}

// Express middleware and utility functions for web integration
module.exports = {
    generateOGImage,
    updateMetaTags,
    generateDynamicHTML
};

// CLI interface
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}
