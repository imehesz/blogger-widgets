const fs = require('fs');
const https = require('https');

// Get blog URL from command-line arguments
const blogUrl = process.argv[2];
if (!blogUrl || !/^https?:\/\/.+\.blogspot\.com/.test(blogUrl)) {
    console.error('Error: Please provide a valid Blogger URL (e.g., https://yourblog.blogspot.com)');
    process.exit(1);
}

let outPutFile = process.argv[3]
if( !outPutFile ) {
    outPutFile = 'last-post.json'
} 

const FEED_URL = `${blogUrl.replace(/\/$/, '')}/feeds/posts/default?alt=json`;

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error('Failed to parse JSON'));
                }
            });
        }).on('error', reject);
    });
}

function stripHTML(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getFirstSentences(text, count = 5) {
    const sentences = text.match(/[^.?!]+[.?!]/g) || [];
    return sentences.slice(0, count).join(' ').trim();
}

async function main() {
    try {
        const json = await fetchJSON(FEED_URL);
        const post = json.feed.entry?.[0];
        if (!post) throw new Error('No posts found in the feed');

        const title = post.title.$t;
        const published = post.published.$t;
        const rawContent = post.content.$t;
        const cleanText = stripHTML(rawContent);
        const excerpt = getFirstSentences(cleanText, 5);
        const link = post.link.find(l => l.rel === 'alternate')?.href || 'No link found';

        const result = { title, published, excerpt, link };

        fs.writeFileSync(`${outPutFile}`, JSON.stringify(result, null, 2));
        console.log(`Saved latest post to ${outPutFile}`);
    } catch (err) {
        console.error('Error:', err.message || err);
        process.exit(1);
    }
}

main();
