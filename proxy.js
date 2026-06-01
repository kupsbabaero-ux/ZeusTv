// api/proxy.js
export default async function handler(req, res) {
    // Payagan ang kahit anong origin (Bypass CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing target URL parameter' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        const response = await fetch(decodedUrl);

        // Kopyahin ang content type (m3u8, ts, mpd) mula sa source server
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // I-stream pabalik ang data sa player mo
        const buffer = await response.arrayBuffer();
        return res.status(200).send(Buffer.from(buffer));
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch the stream securely', details: error.message });
    }
}