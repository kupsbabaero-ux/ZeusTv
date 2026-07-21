export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL param is required.");
  }

  try {
    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch stream source.");
    }

    // Pass headers para sa CORS at tamang Content-Type
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).send("Proxy Error: " + error.message);
  }
}
