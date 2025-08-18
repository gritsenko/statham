#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { generateQuoteImage } = require('../../generate-quote-image.js');

async function generateMultipleImages(startId = 1, endId = 10, outputDir = null) {
    // Load quotes data to get the actual range
    const dataPath = path.join(__dirname, 'statham', 'data.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found: ${dataPath}`);
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const maxId = Math.max(...data.quotes.map(q => q.id));
    
    // Validate range
    if (endId > maxId) {
        console.log(`Adjusting end ID from ${endId} to ${maxId} (max available)`);
        endId = maxId;
    }
    
    // Create output directory if specified
    if (outputDir) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }
    
    console.log(`Generating images for quotes ${startId} to ${endId}...`);
    
    const errors = [];
    const successes = [];
    
    for (let id = startId; id <= endId; id++) {
        try {
            const outputPath = outputDir ? 
                path.join(outputDir, `quote_${id}.png`) : 
                undefined;
            
            const generatedPath = await generateQuoteImage(id, outputPath);
            successes.push({ id, path: generatedPath });
            console.log(`✅ Generated quote #${id}`);
        } catch (error) {
            errors.push({ id, error: error.message });
            console.error(`❌ Failed to generate quote #${id}: ${error.message}`);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully generated: ${successes.length} images`);
    console.log(`❌ Failed: ${errors.length} images`);
    
    if (errors.length > 0) {
        console.log(`\nErrors:`);
        errors.forEach(({ id, error }) => {
            console.log(`  Quote #${id}: ${error}`);
        });
    }
    
    return { successes, errors };
}

async function generateRandomImages(count = 5, outputDir = null) {
    // Load quotes data
    const dataPath = path.join(__dirname, 'statham', 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Get random quote IDs
    const allIds = data.quotes.map(q => q.id);
    const randomIds = [];
    
    for (let i = 0; i < count && randomIds.length < allIds.length; i++) {
        let randomId;
        do {
            randomId = allIds[Math.floor(Math.random() * allIds.length)];
        } while (randomIds.includes(randomId));
        randomIds.push(randomId);
    }
    
    console.log(`Generating ${randomIds.length} random quote images: ${randomIds.join(', ')}`);
    
    const results = { successes: [], errors: [] };
    
    for (const id of randomIds) {
        try {
            const outputPath = outputDir ? 
                path.join(outputDir, `quote_${id}.png`) : 
                undefined;
            
            const generatedPath = await generateQuoteImage(id, outputPath);
            results.successes.push({ id, path: generatedPath });
        } catch (error) {
            results.errors.push({ id, error: error.message });
        }
    }
    
    return results;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node batch-generate.js <startId> <endId> [outputDir]  # Generate range');
        console.log('  node batch-generate.js random <count> [outputDir]     # Generate random');
        console.log('  node batch-generate.js all [outputDir]               # Generate all');
        console.log('');
        console.log('Examples:');
        console.log('  node batch-generate.js 1 10                          # Generate quotes 1-10');
        console.log('  node batch-generate.js random 5                      # Generate 5 random quotes');
        console.log('  node batch-generate.js all ./images                  # Generate all quotes to ./images folder');
        process.exit(1);
    }
    
    const command = args[0];
    
    if (command === 'random') {
        const count = parseInt(args[1]) || 5;
        const outputDir = args[2];
        
        generateRandomImages(count, outputDir)
            .then(({ successes, errors }) => {
                console.log(`✅ Generated ${successes.length} random quote images`);
                if (errors.length > 0) {
                    console.log(`❌ ${errors.length} failed`);
                }
            })
            .catch(error => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
            
    } else if (command === 'all') {
        const outputDir = args[1];
        
        // Load data to get full range
        const dataPath = path.join(__dirname, 'statham', 'data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const minId = Math.min(...data.quotes.map(q => q.id));
        const maxId = Math.max(...data.quotes.map(q => q.id));
        
        generateMultipleImages(minId, maxId, outputDir)
            .then(() => {
                console.log('✅ Batch generation completed!');
            })
            .catch(error => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
            
    } else {
        const startId = parseInt(command);
        const endId = parseInt(args[1]);
        const outputDir = args[2];
        
        if (isNaN(startId) || isNaN(endId)) {
            console.error('Error: startId and endId must be numbers');
            process.exit(1);
        }
        
        if (startId > endId) {
            console.error('Error: startId must be less than or equal to endId');
            process.exit(1);
        }
        
        generateMultipleImages(startId, endId, outputDir)
            .then(() => {
                console.log('✅ Batch generation completed!');
            })
            .catch(error => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
    }
}

module.exports = { generateMultipleImages, generateRandomImages };
