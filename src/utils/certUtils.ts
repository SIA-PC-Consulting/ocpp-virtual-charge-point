import * as forge from 'node-forge';
import * as crypto from 'crypto';

export type KeyType = 'RSA' | 'ECC';

export function generateCSR(options: {
  commonName: string;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  keyType?: KeyType; // 'RSA' or 'ECC'
}): { csr: string; privateKey: string } {
  const keyType = options.keyType || 'RSA';
  
  let keys: forge.pki.rsa.KeyPair;
  let privateKeyPem: string;
  
  if (keyType === 'ECC') {
    // Generate ECC key pair using secp256r1 (prime256v1)
    // This is required for ISO 15118-20 / V2G20Certificate
    keys = forge.pki.rsa.generateKeyPair({
      bits: 256,
      workers: -1,
    });
    // Note: node-forge doesn't have full ECC support, so we'll use a workaround
    // For production, use OpenSSL or a library with proper ECC support
    throw new Error('ECC support requires OpenSSL. Please use generateCSRWithOpenSSL() instead.');
  } else {
    // Generate RSA key pair (for ChargingStationCertificate or V2GCertificate)
    keys = forge.pki.rsa.generateKeyPair(2048);
  }

  // Create a CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  
  // Set subject attributes
  csr.setSubject([
    { name: 'commonName', value: options.commonName },
    { name: 'countryName', value: options.country || 'US' },
    { shortName: 'ST', value: options.state || 'California' },
    { name: 'localityName', value: options.locality || 'San Francisco' },
    { name: 'organizationName', value: options.organization || 'Test' },
    { shortName: 'OU', value: options.organizationalUnit || 'ChargingStation' }
  ]);

  // Sign the CSR with the private key
  csr.sign(keys.privateKey);

  // Convert to PEM format
  const csrPem = forge.pki.certificationRequestToPem(csr);
  privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

  return {
    csr: csrPem,
    privateKey: privateKeyPem
  };
}

// Generate CSR using OpenSSL (supports ECC properly)
export async function generateCSRWithOpenSSL(options: {
  commonName: string;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  keyType?: KeyType;
  outputKeyFile?: string;
  outputCSRFile?: string;
}): Promise<{ csr: string; privateKey: string }> {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const keyType = options.keyType || 'ECC';
  const tmpDir = os.tmpdir();
  const keyFile = options.outputKeyFile || path.join(tmpDir, `key-${Date.now()}.pem`);
  const csrFile = options.outputCSRFile || path.join(tmpDir, `csr-${Date.now()}.pem`);
  
  const country = options.country || 'DE';
  const state = options.state || 'Bavaria';
  const locality = options.locality || 'Munich';
  const organization = options.organization || 'Test';
  const ou = options.organizationalUnit || 'HUBOpenProvCert201';
  
  const subject = `/C=${country}/ST=${state}/L=${locality}/O=${organization}/OU=${ou}/CN=${options.commonName}`;
  
  try {
    if (keyType === 'ECC') {
      // Generate ECC key (secp256r1 / prime256v1) for ISO 15118-20
      execSync(`openssl ecparam -name prime256v1 -genkey -noout -out "${keyFile}"`);
      execSync(`openssl req -new -key "${keyFile}" -out "${csrFile}" -subj "${subject}"`);
    } else {
      // Generate RSA key for other certificate types
      execSync(`openssl req -new -newkey rsa:2048 -nodes -keyout "${keyFile}" -out "${csrFile}" -subj "${subject}"`);
    }
    
    const csr = fs.readFileSync(csrFile, 'utf8');
    const privateKey = fs.readFileSync(keyFile, 'utf8');
    
    // Clean up temp files unless output files were specified
    if (!options.outputKeyFile) fs.unlinkSync(keyFile);
    if (!options.outputCSRFile) fs.unlinkSync(csrFile);
    
    return { csr, privateKey };
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(keyFile) && !options.outputKeyFile) fs.unlinkSync(keyFile);
      if (fs.existsSync(csrFile) && !options.outputCSRFile) fs.unlinkSync(csrFile);
    } catch {}
    throw error;
  }
}

/**
 * Generate OCSP request data for certificate status checking
 * Note: This is a simplified version. For production use, prefer generateOCSPRequestDataWithOpenSSL()
 * @param certificatePem - The certificate in PEM format
 * @param issuerCertificatePem - The issuer certificate in PEM format  
 * @param responderURL - The OCSP responder URL
 * @param hashAlgorithm - Hash algorithm to use (default: SHA256)
 * @returns OCSP request data object
 */
export function generateOCSPRequestData(
  certificatePem: string,
  issuerCertificatePem: string,
  responderURL: string,
  hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512' = 'SHA256'
): {
  hashAlgorithm: string;
  issuerNameHash: string;
  issuerKeyHash: string;
  serialNumber: string;
  responderURL: string;
} {
  // Parse certificates
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const issuerCertificate = forge.pki.certificateFromPem(issuerCertificatePem);

  // Get serial number (remove leading zeros and convert to hex without 0x prefix)
  const serialNumber = certificate.serialNumber.replace(/^0+/, '') || '0';

  // For now, generate placeholder hashes - in production, use OpenSSL version
  // These would need proper DER encoding of issuer name and public key
  const issuerNameHash = crypto.createHash(hashAlgorithm.toLowerCase())
    .update(issuerCertificate.subject.toString())
    .digest('hex');

  const issuerKeyHash = crypto.createHash(hashAlgorithm.toLowerCase())
    .update(issuerCertificate.publicKey.toString())
    .digest('hex');

  return {
    hashAlgorithm: hashAlgorithm.toLowerCase(), // Convert to lowercase for jsrsasign compatibility
    issuerNameHash,
    issuerKeyHash,
    serialNumber,
    responderURL
  };
}

/**
 * Generate OCSP request data using OpenSSL (more reliable for production)
 * @param certificateFile - Path to certificate file
 * @param issuerCertificateFile - Path to issuer certificate file
 * @param responderURL - The OCSP responder URL
 * @param hashAlgorithm - Hash algorithm to use (default: SHA256)
 * @returns OCSP request data object
 */
export async function generateOCSPRequestDataWithOpenSSL(
  certificateFile: string,
  issuerCertificateFile: string,
  responderURL: string,
  hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512' = 'SHA256'
): Promise<{
  hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512';
  issuerNameHash: string;
  issuerKeyHash: string;
  serialNumber: string;
  responderURL: string;
}> {
  const { execSync } = require('child_process');
  
  try {
    // Get serial number
    const serialNumberOutput = execSync(`openssl x509 -in "${certificateFile}" -serial -noout`, { encoding: 'utf8' });
    const serialNumber = serialNumberOutput.replace('serial=', '').trim().replace(/^0+/, '') || '0';

    // Get issuer name hash
    const issuerNameHashOutput = execSync(`openssl x509 -in "${certificateFile}" -issuer -nameopt RFC2253 -noout`, { encoding: 'utf8' });
    const issuerName = issuerNameHashOutput.replace('issuer=', '').trim();
    const issuerNameHash = crypto.createHash(hashAlgorithm.toLowerCase())
      .update(issuerName)
      .digest('hex');

    // Get issuer key hash
    const issuerKeyHashOutput = execSync(`openssl x509 -in "${issuerCertificateFile}" -pubkey -noout | openssl pkey -pubin -outform DER`, { encoding: 'binary' });
    const issuerKeyHash = crypto.createHash(hashAlgorithm.toLowerCase())
      .update(issuerKeyHashOutput, 'binary')
      .digest('hex');

    return {
      hashAlgorithm,
      issuerNameHash,
      issuerKeyHash,
      serialNumber,
      responderURL
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate OCSP request data: ${errorMessage}`);
  }
}

/**
 * Generate mock certificate hash data for testing purposes
 * This creates realistic-looking certificate hash data for different certificate types
 */
export function generateMockCertificateHashData(
  certificateType: 'V2GRootCertificate' | 'MORootCertificate' | 'CSMSRootCertificate' | 'V2GCertificateChain' | 'ManufacturerRootCertificate' | 'OEMRootCertificate',
  hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512' = 'SHA256'
): {
  hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512';
  issuerNameHash: string;
  issuerKeyHash: string;
  serialNumber: string;
} {
  // Generate realistic-looking hash data based on certificate type
  const baseData = `${certificateType}-${Date.now()}-${Math.random()}`;
  
  // Generate issuer name hash (simulates hash of issuer DN, max 128 chars)
  const issuerName = `CN=${certificateType} Root CA,O=Test Organization,C=DE`;
  const fullIssuerNameHash = crypto.createHash(hashAlgorithm.toLowerCase())
    .update(issuerName)
    .digest('hex');
  const issuerNameHash = fullIssuerNameHash.length > 128 ? fullIssuerNameHash.substring(0, 128) : fullIssuerNameHash;

  // Generate issuer key hash (simulates hash of issuer public key, max 128 chars)
  const issuerKeyData = `public-key-${certificateType}-${Math.random()}`;
  const fullIssuerKeyHash = crypto.createHash(hashAlgorithm.toLowerCase())
    .update(issuerKeyData)
    .digest('hex');
  const issuerKeyHash = fullIssuerKeyHash.length > 128 ? fullIssuerKeyHash.substring(0, 128) : fullIssuerKeyHash;

  // Generate serial number (hex format without leading zeros, max 40 chars)
  const fullSerialNumber = crypto.createHash(hashAlgorithm.toLowerCase())
    .update(baseData)
    .digest('hex')
    .replace(/^0+/, '') || '1';
  
  // Truncate to max 40 characters as per OCPP specification
  const serialNumber = fullSerialNumber.length > 40 ? fullSerialNumber.substring(0, 40) : fullSerialNumber;

  return {
    hashAlgorithm,
    issuerNameHash,
    issuerKeyHash,
    serialNumber
  };
}

/**
 * Generate sample certificate hash data chain for GetInstalledCertificateIds response
 * This creates a realistic set of installed certificates for testing
 */
export function generateSampleCertificateHashDataChain(
  requestedTypes?: Array<'V2GRootCertificate' | 'MORootCertificate' | 'CSMSRootCertificate' | 'V2GCertificateChain' | 'ManufacturerRootCertificate' | 'OEMRootCertificate'>
): Array<{
  certificateType: 'V2GRootCertificate' | 'MORootCertificate' | 'CSMSRootCertificate' | 'V2GCertificateChain' | 'ManufacturerRootCertificate' | 'OEMRootCertificate';
  certificateHashData: {
    hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512';
    issuerNameHash: string;
    issuerKeyHash: string;
    serialNumber: string;
  };
  childCertificateHashData?: Array<{
    hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512';
    issuerNameHash: string;
    issuerKeyHash: string;
    serialNumber: string;
  }>;
}> {
  const allCertificateTypes: Array<'V2GRootCertificate' | 'MORootCertificate' | 'CSMSRootCertificate' | 'V2GCertificateChain' | 'ManufacturerRootCertificate' | 'OEMRootCertificate'> = [
    'V2GRootCertificate',
    'MORootCertificate', 
    'CSMSRootCertificate',
    'V2GCertificateChain',
    'ManufacturerRootCertificate',
    'OEMRootCertificate'
  ];

  // Use requested types if provided, otherwise use all types
  const certificateTypes = requestedTypes || allCertificateTypes;

  return certificateTypes.map(certType => {
    const mainCert = generateMockCertificateHashData(certType);
    
    // For V2GCertificateChain, add child certificates
    let childCerts: Array<{
      hashAlgorithm: 'SHA256' | 'SHA384' | 'SHA512';
      issuerNameHash: string;
      issuerKeyHash: string;
      serialNumber: string;
    }> | undefined;
    
    if (certType === 'V2GCertificateChain') {
      // Generate 2-3 child certificates for the chain
      childCerts = [
        generateMockCertificateHashData('V2GCertificateChain'),
        generateMockCertificateHashData('V2GCertificateChain')
      ];
    }

    return {
      certificateType: certType,
      certificateHashData: mainCert,
      childCertificateHashData: childCerts
    };
  });
}

/**
 * Generate a PEM-encoded X.509 certificate for testing purposes
 * This creates a self-signed certificate that's under 10000 characters
 */
export function generatePEMCertificate(options: {
  commonName: string;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  keyType?: KeyType;
  validityDays?: number;
}): { certificate: string; privateKey: string } {
  const keyType = options.keyType || 'RSA';
  const validityDays = options.validityDays || 365;
  
  // Generate key pair
  let keys: forge.pki.rsa.KeyPair;
  
  if (keyType === 'ECC') {
    throw new Error('ECC certificate generation requires OpenSSL. Please use generatePEMCertificateWithOpenSSL() instead.');
  } else {
    // Generate RSA key pair (2048 bits for reasonable size)
    keys = forge.pki.rsa.generateKeyPair(2048);
  }

  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  
  // Set validity period
  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  cert.validity.notAfter = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  // Set subject attributes
  cert.setSubject([
    { name: 'commonName', value: options.commonName },
    { name: 'countryName', value: options.country || 'DE' },
    { shortName: 'ST', value: options.state || 'Bavaria' },
    { name: 'localityName', value: options.locality || 'Munich' },
    { name: 'organizationName', value: options.organization || 'Test Organization' },
    { shortName: 'OU', value: options.organizationalUnit || 'Test Unit' }
  ]);

  // Set issuer (same as subject for self-signed certificate)
  cert.setIssuer(cert.subject.attributes);

  // Set extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
      critical: true
    },
    {
      name: 'keyUsage',
      keyCertSign: false,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: false,
      critical: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS
          value: options.commonName
        }
      ]
    }
  ]);

  // Sign the certificate
  cert.sign(keys.privateKey);

  // Convert to PEM format
  const certificatePem = forge.pki.certificateToPem(cert);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

  return {
    certificate: certificatePem,
    privateKey: privateKeyPem
  };
}

/**
 * Generate a PEM-encoded X.509 certificate using OpenSSL (more reliable)
 * This creates a certificate that's under 10000 characters
 */
export async function generatePEMCertificateWithOpenSSL(options: {
  commonName: string;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  keyType?: KeyType;
  validityDays?: number;
  outputCertFile?: string;
  outputKeyFile?: string;
}): Promise<{ certificate: string; privateKey: string; length: number }> {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const keyType = options.keyType || 'RSA';
  const validityDays = options.validityDays || 365;
  const tmpDir = os.tmpdir();
  const keyFile = options.outputKeyFile || path.join(tmpDir, `key-${Date.now()}.pem`);
  const certFile = options.outputCertFile || path.join(tmpDir, `cert-${Date.now()}.pem`);
  
  const country = options.country || 'DE';
  const state = options.state || 'Bavaria';
  const locality = options.locality || 'Munich';
  const organization = options.organization || 'Test Organization';
  const ou = options.organizationalUnit || 'Test Unit';
  
  const subject = `/C=${country}/ST=${state}/L=${locality}/O=${organization}/OU=${ou}/CN=${options.commonName}`;
  
  try {
    if (keyType === 'ECC') {
      // Generate ECC key and certificate
      execSync(`openssl ecparam -name prime256v1 -genkey -noout -out "${keyFile}"`);
      execSync(`openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days ${validityDays} -subj "${subject}"`);
    } else {
      // Generate RSA key and certificate
      execSync(`openssl req -new -newkey rsa:2048 -nodes -keyout "${keyFile}" -x509 -out "${certFile}" -days ${validityDays} -subj "${subject}"`);
    }
    
    const certificate = fs.readFileSync(certFile, 'utf8');
    const privateKey = fs.readFileSync(keyFile, 'utf8');
    
    // Check certificate length
    const certLength = certificate.length;
    
    // Clean up temp files unless output files were specified
    if (!options.outputKeyFile) fs.unlinkSync(keyFile);
    if (!options.outputCertFile) fs.unlinkSync(certFile);
    
    return { certificate, privateKey, length: certLength };
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(keyFile) && !options.outputKeyFile) fs.unlinkSync(keyFile);
      if (fs.existsSync(certFile) && !options.outputCertFile) fs.unlinkSync(certFile);
    } catch {}
    throw error;
  }
}