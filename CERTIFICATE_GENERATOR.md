# Certificate Generator

This script generates PEM-encoded X.509 certificates for testing OCPP certificate operations.

## Usage

```bash
npx tsx generate-certificate.ts
```

## What it generates

- **Certificate**: `generated-certificate.pem` - A self-signed X.509 certificate
- **Private Key**: `generated-private-key.pem` - The corresponding private key

## Certificate Details

- **Format**: PEM-encoded X.509
- **Type**: Self-signed certificate
- **Key Size**: 2048-bit RSA
- **Validity**: 365 days from generation
- **Size**: Under 10,000 characters (OCPP compliant)

## Configuration

You can modify the certificate details by editing the `config` object in `generate-certificate.ts`:

```typescript
const config = {
  commonName: 'test-charging-station.example.com',
  country: 'DE',
  state: 'Bavaria',
  locality: 'Munich',
  organization: 'Test Charging Station Organization',
  organizationalUnit: 'Charging Station Unit',
  keyType: 'RSA' as const,
  validityDays: 365,
  outputCertFile: 'generated-certificate.pem',
  outputKeyFile: 'generated-private-key.pem'
};
```

## Requirements

- Node.js with TypeScript support
- OpenSSL (preferred) or node-forge library
- The certUtils.ts utility functions

## Generated Files

After running the script, you'll have:

1. `generated-certificate.pem` - The X.509 certificate
2. `generated-private-key.pem` - The private key

These files can be used for:
- OCPP certificate testing
- SSL/TLS configuration
- Certificate installation testing
- Certificate validation testing

