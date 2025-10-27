# Certificate JSON Generator

This script generates PEM-encoded X.509 certificates and formats them as properly escaped JSON payloads for API requests.

## Usage

```bash
npx tsx generate-certificate-json.ts
```

## What it generates

The script creates JSON payloads for different OCPP certificate operations:

### 1. Install Certificate Payload
```json
{
  "certificateType": "V2GRootCertificate",
  "certificate": "-----BEGIN CERTIFICATE-----\\n[ESCAPED_CERT_DATA]\\n-----END CERTIFICATE-----\\n"
}
```

### 2. Certificate Signed Payload
```json
{
  "certificateChain": "-----BEGIN CERTIFICATE-----\\n[ESCAPED_CERT_DATA]\\n-----END CERTIFICATE-----\\n",
  "certificateType": "V2GCertificate"
}
```

### 3. Sign Certificate Payload (Template)
```json
{
  "csr": "-----BEGIN CERTIFICATE REQUEST-----\\n[CSR_DATA_WOULD_GO_HERE]\\n-----END CERTIFICATE REQUEST-----",
  "certificateType": "ChargingStationCertificate"
}
```

### 4. Complete Certificate Data
```json
{
  "certificate": "[ESCAPED_CERT_DATA]",
  "privateKey": "[ESCAPED_PRIVATE_KEY]",
  "certificateType": "V2GRootCertificate",
  "commonName": "test-charging-station.example.com",
  "organization": "Test Charging Station Organization",
  "validityDays": 365,
  "generatedAt": "2025-10-24T12:05:04.538Z"
}
```

## Generated Files

After running the script, you'll have:

1. `install-certificate-payload.json` - For InstallCertificate requests
2. `certificate-signed-payload.json` - For CertificateSigned requests
3. `sign-certificate-payload.json` - For SignCertificate requests (template)
4. `certificate-data.json` - Complete certificate data with metadata

## Key Features

- ✅ **Proper JSON Escaping**: All newlines in certificates are properly escaped as `\\n`
- ✅ **Ready for API Use**: Copy-paste directly into API request bodies
- ✅ **Multiple Formats**: Different payloads for different OCPP operations
- ✅ **File Output**: All payloads saved to individual JSON files
- ✅ **Console Output**: Payloads displayed in console for easy copying
- ✅ **OCPP Compliant**: Certificates under 10,000 characters

## Configuration

You can modify the certificate details by editing the `config` object in `generate-certificate-json.ts`:

```typescript
const config = {
  commonName: 'your-charging-station.example.com',
  country: 'DE',
  state: 'Bavaria',
  locality: 'Munich',
  organization: 'Your Organization',
  organizationalUnit: 'Your Unit',
  keyType: 'RSA' as const,
  validityDays: 365
};
```

## Usage Instructions

1. Run the script: `npx tsx generate-certificate-json.ts`
2. Copy the JSON payload you need from the console output
3. Paste it directly into your API request body
4. The certificate data is properly escaped for JSON
5. All files are also saved to disk for reference

## Requirements

- Node.js with TypeScript support
- OpenSSL (preferred) or node-forge library
- The certUtils.ts utility functions

## Example API Usage

```bash
# Example curl request using the generated JSON
curl -X POST https://your-api-endpoint.com/install-certificate \
  -H "Content-Type: application/json" \
  -d @install-certificate-payload.json
```

The generated JSON payloads are ready to use in any HTTP client or API testing tool.

