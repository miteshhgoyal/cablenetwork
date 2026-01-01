import React from "react";

const Doc = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 text-xs md:text-sm p-4 md:p-8 font-mono max-w-7xl mx-auto space-y-6 overflow-x-auto">
      {/* Header */}
      <div className="text-center border-b border-gray-700 pb-6">
        <p className="mt-2 text-gray-400">
          API URL: https://api.onlineiptvhub.com
        </p>
        <p className="mt-2 text-gray-400">
          Auth: JWT Bearer Token from POST /login for protected routes
        </p>
      </div>

      {/* 1. Authentication Flow */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-green-600 text-xs rounded font-bold">
            POST
          </span>
          <code>/api/customer/login</code>
        </h2>
        <p className="mb-4 text-gray-300">
          Register/login device using MAC + reseller partner code. Supports
          custom MAC (use another active license). Populates
          packages.channels.language.genre.primaryPackageId[file:2]
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-bold mb-2">Request JSON</h4>
            <pre className="bg-gray-900 p-3 rounded text-[10px] md:text-xs overflow-x-auto">
              {`{
  "partnerCode": "XYZ123",     // Reseller partner code
  "macAddress": "aabbccddeeff", // Device MAC
  "deviceName": "Mi TV Box",    // Device name
  "customMac": "112233445566"   // Optional: use another active MAC
}`}{" "}
            </pre>
          </div>
          <div>
            <h4 className="font-bold mb-2">Success Response (200)</h4>
            <pre className="bg-gray-900 p-3 rounded text-[10px] md:text-xs overflow-x-auto max-h-40 overflow-y-auto">
              {`{
  "success": true,
  "data": {
    "subscriber": {
      "name": "Device Name",
      "expiryDate": "2026-02-01T00:00:00Z",
      "packageName": "Sports Pack",
      "totalPackages": 2,
      "totalChannels": 150,
      "macAddress": "aabbccddeeff",
      "status": "Active",
      "usingCustomMac": false
    },
    "channels": [{
      "id": "...",
      "name": "Star Sports",
      "lcn": 101,
      "proxyUrl": "http://api.proxy.stream?url=...",
      "genre": {"name": "Sports"},
      "language": {"name": "Hindi"},
      "packageNames": ["Sports Pack"]
    }],
    "packagesList": [{
      "id": "...",
      "name": "Sports",
      "cost": 199,
      "duration": 30,
      "channelCount": 50
    }],
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "serverInfo": {
      "proxyEnabled": true,
      "apiUrl": "http://localhost:8000"
    }
  }
}`}{" "}
            </pre>
          </div>
        </div>

        <div className="bg-red-900/30 p-4 rounded-lg">
          <h4 className="font-bold mb-2">Error Codes</h4>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <code>
              CUSTOMMACNOTACTIVE
              <br />
              404 Invalid MAC
            </code>
            <code>
              MACFRESH
              <br />
              403 Needs activation
            </code>
            <code>
              MACSWITCHEDPARTNER
              <br />
              201 Switched reseller
            </code>
            <code>
              SUBSCRIPTIONEXPIRED
              <br />
              403 Expired
            </code>
            <code>
              NOPACKAGES
              <br />
              403 No packages
            </code>
          </div>
        </div>
      </div>

      {/* 2. Check Status */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/check-status</code>
        </h2>
        <p className="mb-4 text-gray-300">
          Check subscription on app startup. Auto-removes expired packages,
          auto-activates Fresh devices[file:2]
        </p>
        <pre className="bg-gray-900 p-3 rounded text-[10px] overflow-x-auto">
          {`Active Response:
{
  "success": true,
  "code": "ACTIVE",
  "data": {
    "status": "Active",
    "expiryDate": "2026-02-01T00:00:00Z",
    "daysRemaining": 31,
    "totalPackages": 2
  }
}

Other: FRESH, INACTIVE, EXPIRED (success: false)`}
        </pre>
      </div>

      {/* 3. Profile */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/profile</code>
        </h2>
        <p className="mb-4 text-gray-300">
          Get subscriber details w/ primaryPackage info[file:2]
        </p>
        <pre className="bg-gray-900 p-3 rounded text-[10px] overflow-x-auto">
          {`{
  "success": true,
  "data": {
    "name": "Device Name",
    "macAddress": "aabbccddeeff",
    "status": "Active",
    "expiryDate": "2026-02-01T00:00:00Z",
    "primaryPackage": {
      "name": "Sports",
      "cost": 199,
      "duration": 30
    },
    "totalPackages": 2,
    "lastLocation": {"coordinates": [75.54, 30.37]},
    "deviceInfo": {
      "isRooted": false,
      "isVPNActive": false
    }
  }
}`}{" "}
        </pre>
      </div>

      {/* 4. Refresh Channels */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/refresh-channels</code>
        </h2>
        <p className="text-gray-300 mb-4">
          Reload channels/packages with proxy URLs. Same structure as login
          response[file:2]
        </p>
      </div>

      {/* 5. Update Location */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-green-600 text-xs rounded font-bold">
            POST
          </span>
          <code>/api/customer/update-location</code>
        </h2>
        <p className="text-gray-300 mb-4">
          Track GPS location (MongoDB 2dsphere index)[file:2]
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <pre className="bg-gray-900 p-3 rounded text-[10px]">
            {`Request:
{
  "latitude": 30.37464,
  "longitude": 75.54732,
  "address": "Budhlada, Punjab"
}`}
          </pre>
          <pre className="bg-gray-900 p-3 rounded text-[10px]">
            {`Response:
{
  "success": true,
  "data": {
    "coordinates": [75.54732, 30.37464]
  }
}`}
          </pre>
        </div>
      </div>

      {/* 6. Update Security */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-green-600 text-xs rounded font-bold">
            POST
          </span>
          <code>/api/customer/update-security-info</code>
        </h2>
        <p className="text-gray-300 mb-4">
          Report device security (root/VPN detection, console warnings)[file:2]
        </p>
        <pre className="bg-gray-900 p-3 rounded text-[10px]">
          {`{
  "isRooted": false,
  "isVPNActive": false,
  "deviceModel": "Mi Box S",
  "osVersion": "Android 12",
  "appVersion": "1.2.3"
}`}
        </pre>
      </div>

      {/* 7. OTT Movies */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/movies?genre=abc&language=xyz</code>
        </h2>
        <p className="text-gray-300 mb-4">
          List movies grouped by genre. Query: genre/language Category
          ID[file:2]
        </p>
        <pre className="bg-gray-900 p-3 rounded text-[10px]">
          {`{
  "success": true,
  "data": {
    "movies": [...],
    "groupedByGenre": {
      "Action": [{
        "id": "...",
        "title": "Avengers",
        "genre": {"name": "Action"},
        "mediaUrl": "https://...avengers.m3u8"
      }]
    },
    "totalCount": 25
  }
}`}{" "}
        </pre>
      </div>

      {/* 8. OTT Series */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/series?genre=abc&language=xyz</code>
        </h2>
        <p className="text-gray-300">
          List web series (includes seasonsCount). Same structure as
          movies[file:2]
        </p>
      </div>

      {/* 9. OTT Detail */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-xs rounded font-bold">
            GET
          </span>
          <code>/api/customer/ott/{`{id}`}</code>
        </h2>
        <p className="text-gray-300">
          Single movie/series details w/ genre/language[file:2]
        </p>
      </div>
    </div>
  );
};

export default Doc;
