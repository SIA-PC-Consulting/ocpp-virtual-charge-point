require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { setVariableMonitoringOcppIncoming } from "./src/v21/messages/setVariableMonitoring";
import { VCP } from "./src/vcp";
import { openPeriodicEventStreamOcppOutgoing } from "./src/v21/messages/openPeriodicEventStream";
import { notifyPeriodicEventStreamOcppOutgoing } from "./src/v21/messages/notifyPeriodicEventStream";
import { closePeriodicEventStreamOcppOutgoing } from "./src/v21/messages/closePeriodicEventStream";
import { notifyEventOcppOutgoing } from "./src/v21/messages/notifyEvent";
import { get15118EVCertificateOcppOutgoing } from "./src/v21/messages/get15118EVCertificate";
import { signCertificateOcppOutgoing } from "./src/v21/messages/signCertificate";
import { generateCSRWithOpenSSL, generateOCSPRequestDataWithOpenSSL } from './src/utils/certUtils';
import { getCertificateStatusOcppOutgoing } from "./src/v21/messages/getCertificateStatus";
import { certificateSignedOcppIncoming } from "./src/v21/messages/certificateSigned";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const vcp = new VCP({
  endpoint: process.env.WS_URL ?? "ws://localhost:8081",
  chargePointId: process.env.CP_ID ?? "TEST-001",
  ocppVersion: OcppVersion.OCPP_2_1,
  basicAuthPassword: process.env.PASSWORD ?? undefined,
  adminPort: Number.parseInt(process.env.ADMIN_WS_PORT ?? "9999"),
});

(async () => {
  await vcp.connect();
  vcp.send(
    bootNotificationOcppOutgoing.request({
      reason: "PowerUp",
      chargingStation: {
        model: "VirtualChargePoint",
        vendorName: "Solidstudio",
      },
    }),
  );  
  await sleep(4000);

  // Generate ECC CSR for V2G20Certificate (required by Hubject ISO 15118-20)
  const { csr, privateKey } = await generateCSRWithOpenSSL({
    commonName: process.env.CP_ID ?? 'TEST-001',
    organizationalUnit: 'HUBOpenProvCert201',
    keyType: 'ECC', // Use ECC (secp256r1) for V2G20Certificate
    country: 'DE',
    state: 'Bavaria',
    locality: 'Munich',
    organization: 'Test'
  });

  vcp.send(
    signCertificateOcppOutgoing.request({
      csr: csr,
      certificateType: "V2G20Certificate",
      requestId: 1,
    })
  );

  // Wait for CertificateSigned message to arrive with the actual certificate
  await sleep(6000);
  
  // Check if we received the certificate chain
  const certificateChain = (vcp as any).receivedCertificateChain;
  
  if (certificateChain) {
    console.log('Certificate chain received, proceeding with GetCertificateStatus...');
    
    // Parse the certificate chain to get the leaf certificate and issuer certificate
    const certificateRegex = /-----BEGIN CERTIFICATE-----\s*[\s\S]*?-----END CERTIFICATE-----/g;
    const certificates = certificateChain.match(certificateRegex) || [];
    
    if (certificates.length >= 2) {
      const leafCertificate = certificates[0];
      const issuerCertificate = certificates[1];
      
      console.log(`Found ${certificates.length} certificates in chain`);
      console.log('Leaf certificate preview:', leafCertificate.substring(0, 100) + '...');
      console.log('Issuer certificate preview:', issuerCertificate.substring(0, 100) + '...');
      
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const tmpDir = os.tmpdir();
      const leafCertFile = path.join(tmpDir, `leaf-cert-${Date.now()}.pem`);
      const issuerCertFile = path.join(tmpDir, `issuer-cert-${Date.now()}.pem`);
      try {
        // Write certificates to temporary files for OpenSSL processing
        
        
        fs.writeFileSync(leafCertFile, leafCertificate);
        fs.writeFileSync(issuerCertFile, issuerCertificate);
        
        console.log(`Wrote certificates to temporary files:`);
        console.log(`Leaf cert file: ${leafCertFile}`);
        console.log(`Issuer cert file: ${issuerCertFile}`);
        console.log(`Leaf cert file size: ${fs.statSync(leafCertFile).size} bytes`);
        console.log(`Issuer cert file size: ${fs.statSync(issuerCertFile).size} bytes`);
        
        // Test if certificates are valid by checking with OpenSSL
        const { execSync } = require('child_process');
        try {
          execSync(`openssl x509 -in "${leafCertFile}" -text -noout`, { stdio: 'pipe' });
          execSync(`openssl x509 -in "${issuerCertFile}" -text -noout`, { stdio: 'pipe' });
          console.log('Certificates are valid');
        } catch (testError) {
          const errorMessage = testError instanceof Error ? testError.message : String(testError);
          console.error('Certificate validation failed:', errorMessage);
          throw new Error('Invalid certificate format');
        }
        
        // Generate proper OCSP request data using OpenSSL (supports ECC)
        const ocspData = await generateOCSPRequestDataWithOpenSSL(
          leafCertFile,
          issuerCertFile,
          "http://ocsp-qa.hubject.com:8080"
        );
        
        console.log('Generated OCSP data:', ocspData);

        vcp.send(
          getCertificateStatusOcppOutgoing.request({
            ocspRequestData: ocspData,
          })
        );
        
        // Clean up temporary files
        try {
          fs.unlinkSync(leafCertFile);
          fs.unlinkSync(issuerCertFile);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary files:', cleanupError);
        }
      } catch (error) {
        console.error('Error generating OCSP data:', error);
        
        // Clean up temporary files in case of error
        try {
          if (fs.existsSync(leafCertFile)) fs.unlinkSync(leafCertFile);
          if (fs.existsSync(issuerCertFile)) fs.unlinkSync(issuerCertFile);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary files after error:', cleanupError);
        }
        
        // Fallback to example data if certificate parsing fails
        vcp.send(
          getCertificateStatusOcppOutgoing.request({
            ocspRequestData: {
              hashAlgorithm: "SHA256",
              issuerNameHash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
              issuerKeyHash: "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
              serialNumber: "1234567890abcdef1234567890abcdef12345678",
              responderURL: "http://ocsp-qa.hubject.com:8080",
            },
          })
        );
      }
    } else {
      console.log('Certificate chain does not contain enough certificates, using example data...');
      
      vcp.send(
        getCertificateStatusOcppOutgoing.request({
          ocspRequestData: {
            hashAlgorithm: "SHA256",
            issuerNameHash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            issuerKeyHash: "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
            serialNumber: "1234567890abcdef1234567890abcdef12345678",
            responderURL: "http://ocsp-qa.hubject.com:8080",
          },
        })
      );
    }
  } else {
    console.log('No certificate chain received yet, using example data...');
    
    vcp.send(
      getCertificateStatusOcppOutgoing.request({
        ocspRequestData: {
          hashAlgorithm: "SHA256",
          issuerNameHash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
          issuerKeyHash: "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
          serialNumber: "1234567890abcdef1234567890abcdef12345678",
          responderURL: "http://ocsp-qa.hubject.com:8080",
        },
      })
    );
  }
  // vcp.send(
  //   get15118EVCertificateOcppOutgoing.request({
  //     iso15118SchemaVersion: "urn:iso:15118:20:2022:MsgDef",
  //     action: "Install",
  //     exiRequest: "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",
  //     maximumContractCertificateChains: 1,
  //     // prioritizedEMAIDs: ["1234567890"],
  //   }),
  // )
})();
