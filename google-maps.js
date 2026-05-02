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
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set in Netlify environment variables" }) };
  }

  const params = event.queryStringParameters || {};
  const type   = params.type || "directions";
  const org    = params.origin      || "17.9970,-76.7936";
  const dest   = params.destination || "18.0100,-76.7890";
  const mode   = params.mode        || "driving";

  let url;
  try {
    if (type === "directions") {
      url = `https://maps.googleapis.com/maps/api/directions/json?origin=${org}&destination=${dest}&alternatives=true&mode=${mode}&departure_time=now&traffic_model=best_guess&key=${key}`;
    } else if (type === "distancematrix") {
      url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${org}&destinations=${dest}&mode=${mode}&departure_time=now&traffic_model=best_guess&key=${key}`;
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
