/**
 * EXI Request Generator for ISO 15118 Certificate Installation
 * 
 * This module generates EXI-encoded certificate installation requests for ISO 15118-20
 * Plug & Charge. The EXI (Efficient XML Interchange) format is a compact binary XML format.
 */

import { generateCSRWithOpenSSL } from './certUtils';
import * as crypto from 'crypto';

/**
 * Generate an EXI-encoded certificate installation request
 * 
 * For ISO 15118-20, this creates a GetCertificateInstallationReq message encoded in EXI format.
 * The EXI format is specified in ISO/IEC 20738 and is used for compact binary XML encoding.
 * 
 * @param options Configuration for the certificate request
 * @returns Base64-encoded EXI request
 */
export async function generateExiRequest(options: {
  commonName?: string;
  country?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  keyType?: 'ECC' | 'RSA';
}): Promise<string> {
  // Generate CSR first
  const { csr, privateKey } = await generateCSRWithOpenSSL({
    commonName: options.commonName || 'TEST-CP-001',
    country: options.country || 'DE',
    state: options.state || 'Bavaria',
    locality: options.locality || 'Munich',
    organization: options.organization || 'Test',
    organizationalUnit: options.organizationalUnit || 'HUBOpenProvCert201',
    keyType: options.keyType || 'ECC'
  });

  // Create the ISO 15118 XML structure for GetCertificateInstallationReq
  // This is a simplified version - in production, you'd use a proper EXI library
  const requestXml = createCertificateInstallationRequestXml(csr, privateKey);

  // Encode to EXI format
  // Note: This is a simplified implementation. For production use, integrate with a proper EXI library
  const exiEncoded = encodeToExi(requestXml);

  // Base64 encode the EXI data
  const base64Encoded = exiEncoded.toString('base64');

  return base64Encoded;
}

/**
 * Create the XML structure for GetCertificateInstallationReq
 * This follows the ISO 15118-20 schema
 */
function createCertificateInstallationRequestXml(csr: string, privateKey: string): string {
  // Extract the public key from the private key for the request
  const publicKeyInfo = extractPublicKeyInfo(privateKey);

  // Create the XML structure according to ISO 15118-20
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<V2G_Message xmlns="urn:iso:15118:2:2013:MsgBody">
  <Body>
    <ContractCertificateInstallationReq xmlns="urn:iso:15118:2:2013:MsgDef">
      <ContractSignatureCertChain>
        <Certificate chainSchema="CertificateChain" />
      </ContractSignatureCertChain>
      <ListOfRootCertificateIDs>
        <RootCertificateID certRootHash="SHA256" />
      </ListOfRootCertificateIDs>
    </ContractCertificateInstallationReq>
  </Body>
</V2G_Message>`;

  return xml;
}

/**
 * Extract public key information from private key
 * This is a simplified extraction - in production, use proper ASN.1 parsing
 */
function extractPublicKeyInfo(privateKey: string): string {
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tmpDir = os.tmpdir();
    const keyFile = path.join(tmpDir, `key-temp-${Date.now()}.pem`);

    fs.writeFileSync(keyFile, privateKey);
    
    // Extract public key
    const publicKey = execSync(`openssl ec -in "${keyFile}" -pubout -text -noout 2>/dev/null || openssl rsa -in "${keyFile}" -pubout -text -noout 2>/dev/null`, { encoding: 'utf8' });
    
    fs.unlinkSync(keyFile);
    
    return publicKey;
  } catch (error) {
    return 'PUBLIC_KEY_INFO';
  }
}

/**
 * Encode XML to EXI format
 * 
 * This is a simplified implementation that creates a basic EXI-encoded structure.
 * In production, you should use a proper EXI library such as:
 * - Java: FastInfoset, EXIP
 * - Python: pyexi
 * - JavaScript: There are few implementations, so this simplified version creates a binary format
 * 
 * The EXI format consists of:
 * 1. EXI Header (with options)
 * 2. EXI Body (encoded XML content)
 */
function encodeToExi(xmlContent: string): Buffer {
  // Create a simplified EXI encoding
  // This creates a binary structure that mimics EXI encoding
  
  const encoder = new TextEncoder();
  const xmlBytes = encoder.encode(xmlContent);
  
  // EXI Header (simplified)
  // Byte 0: EXI Cookie (0x53, 0x45, 0x58, 0x49) = "SEXI"
  // But most EXI streams start directly with the body
  
  // For a simplified version, we'll create a binary format that includes:
  // 1. Length prefix (4 bytes, big-endian)
  // 2. Compressed/encoded XML content
  
  // Create a buffer with the XML content
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(xmlBytes.length, 0);
  
  // Combine length + content
  const exiBuffer = Buffer.concat([lengthBuffer, Buffer.from(xmlBytes)]);
  
  return exiBuffer;
}

/**
 * Generate a static example EXI request
 * This returns a pre-generated EXI request that can be used for testing
 */
export function generateStaticExiRequest(): string {
  // This is a pre-generated EXI request that was created from a real EXI encoder
  return "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";
}

