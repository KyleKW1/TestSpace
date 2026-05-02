const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error("JSON parse failed: " + data.slice(0,200))); }
      });
    }).on("error", reject);
  });
}

exports.handler = async (event) => {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "TOMTOM_API_KEY not set in Netlify environment variables" }) };
  }

  const params = event.queryStringParameters || {};
  const type   = params.type || "flow";
  const bbox   = params.bbox || "-76.85,17.95,-76.75,18.05";

  let url;
  try {
    if (type === "flow") {
      const parts = bbox.split(",");
      const lat = ((parseFloat(parts[1]) + parseFloat(parts[3])) / 2).toFixed(5);
      const lon = ((parseFloat(parts[0]) + parseFloat(parts[2])) / 2).toFixed(5);
      url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&key=${key}`;
    } else if (type === "incidents") {
      url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},from,to}}}&language=en-GB&t=1111&key=${key}`;
    } else if (type === "route") {
      const org  = params.origin      || "17.9970,-76.7936";
      const dest = params.destination || "18.0100,-76.7890";
      url = `https://api.tomtom.com/routing/1/calculateRoute/${org}:${dest}/json?traffic=true&travelMode=car&key=${key}`;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown type" }) };
    }

    const data = await httpsGet(url);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message, url: url || "not built" }),
    };
  }
};
