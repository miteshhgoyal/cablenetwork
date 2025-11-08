import express from 'express';
import axios from 'axios';

const router = express.Router();

// Proxy streaming video content
router.get('/stream', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL parameter required'
            });
        }

        // Decode the URL
        const targetUrl = decodeURIComponent(url);

        // Set up headers to mimic a browser request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        };

        // Add referer if available
        try {
            headers['Referer'] = new URL(targetUrl).origin;
        } catch (e) {
            // Invalid URL, skip referer
        }

        // Forward range header for video seeking
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Make request to actual streaming server
        const response = await axios({
            method: 'GET',
            url: targetUrl,
            responseType: 'stream',
            headers: headers,
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Accept redirects and client errors
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Encoding, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

        // Forward status and content headers
        res.status(response.status);
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // Stream the response
        response.data.pipe(res);

        // Handle stream errors
        response.data.on('error', (error) => {
            console.error('Stream pipe error:', error.message);
            if (!res.headersSent) {
                res.status(500).end();
            }
        });

    } catch (error) {
        console.error('Proxy stream error:', error.message);

        if (!res.headersSent) {
            res.status(error.response?.status || 500).json({
                success: false,
                message: 'Failed to proxy stream',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Stream unavailable'
            });
        }
    }
});

// Proxy M3U8 playlist files
router.get('/m3u8', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL parameter required'
            });
        }

        const targetUrl = decodeURIComponent(url);
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        const API_URL = process.env.API_URL || 'http://localhost:8000';

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': new URL(targetUrl).origin
            },
            timeout: 15000
        });

        let content = response.data;

        // Rewrite absolute URLs in M3U8 to go through proxy
        content = content.replace(/(https?:\/\/[^\s\n]+)/g, (match) => {
            const cleanUrl = match.trim();
            return `${API_URL}/api/proxy/stream?url=${encodeURIComponent(cleanUrl)}`;
        });

        // Handle relative URLs (.ts segments, .m3u8 variants)
        content = content.split('\n').map(line => {
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (trimmedLine.startsWith('#') || trimmedLine === '') {
                return line;
            }

            // Check if it's a relative URL
            if (!trimmedLine.startsWith('http')) {
                const fullUrl = baseUrl + trimmedLine;
                return `${API_URL}/api/proxy/stream?url=${encodeURIComponent(fullUrl)}`;
            }

            return line;
        }).join('\n');

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(content);

    } catch (error) {
        console.error('M3U8 proxy error:', error.message);

        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to proxy M3U8',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Playlist unavailable'
        });
    }
});

// Health check for proxy
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Proxy service is running',
        timestamp: new Date().toISOString()
    });
});

export default router;
