(function() {
    // Lightweight REST client for Chainlink Stream signed requests.
    // Performs client-side HMAC auth using SubtleCrypto; expects apiKey/apiSecret to be provided by caller.
    const CustomHeaders = {
        authzHeader: "Authorization",
        authzTSHeader: "X-Authorization-Timestamp",
        authzSigHeader: "X-Authorization-Signature-SHA256",
    };

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function hmacSha256(key, message) {
        const enc = new TextEncoder();
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(key),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await window.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            enc.encode(message)
        );
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    class Config {
        constructor(apiKey, apiSecret, restURL) {
            this.ApiKey = apiKey;
            this.ApiSecret = apiSecret;
            this.RestURL = restURL;
        }
    }

    class Client {
        constructor(config) {
            this.config = config;
        }

        async getLatestReport(feedID) {
            // feedID is hex string.
            return await this._req("GET", "/api/v1/reports/latest", { feedID: feedID });
        }

        async _req(method, path, params, body) {
            const reqUrl = new URL(path, this.config.RestURL);
            if (params) {
                Object.keys(params).forEach(key => {
                    reqUrl.searchParams.append(key, params[key]);
                });
            }

            let bodyStr = "";
            if (body) {
                // Assuming body is string for now as we only do GET
                bodyStr = body;
            }

            const timestamp = Date.now();
            const fullPath = reqUrl.pathname + reqUrl.search;
            
            // Body hash
            const bodyHash = await sha256(bodyStr);
            
            const clientId = this.config.ApiKey;
            const userSecret = this.config.ApiSecret;
            
            // `${method} ${path} ${bodyHash} ${clientId} ${timestamp.toFixed(0)}`
            const allPreImage = `${method} ${fullPath} ${bodyHash} ${clientId} ${timestamp.toFixed(0)}`;
            
            const signature = await hmacSha256(userSecret, allPreImage);

            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                [CustomHeaders.authzHeader]: clientId,
                [CustomHeaders.authzTSHeader]: timestamp.toFixed(0),
                [CustomHeaders.authzSigHeader]: signature
            };

            const response = await fetch(reqUrl.toString(), {
                method: method,
                headers: headers,
                body: body ? body : undefined
            });

            if (!response.ok) {
                throw new Error(`Chainlink API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            // Return the report object directly
            return data.report; 
        }
    }

    window.ChainlinkStream = {
        Config,
        Client
    };
})();
