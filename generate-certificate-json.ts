import { generatePEMCertificate, generatePEMCertificateWithOpenSSL } from './src/utils/certUtils';

async function main() {
  console.log('🔐 Certificate Generator for JSON API Payload');
  console.log('==============================================');

  // Configuration - modify these values as needed
  const config = {
    commonName: 'test-charging-station.example.com',
    country: 'DE',
    state: 'Bavaria',
    locality: 'Munich',
    organization: 'Test Charging Station Organization',
    organizationalUnit: 'Charging Station Unit',
    keyType: 'RSA' as const,
    validityDays: 365
  };

  console.log('\n📋 Configuration:');
  console.log(`   Common Name: ${config.commonName}`);
  console.log(`   Country: ${config.country}`);
  console.log(`   State: ${config.state}`);
  console.log(`   Locality: ${config.locality}`);
  console.log(`   Organization: ${config.organization}`);
  console.log(`   Organizational Unit: ${config.organizationalUnit}`);
  console.log(`   Key Type: ${config.keyType}`);
  console.log(`   Validity: ${config.validityDays} days`);

  let certificate = '';
  let privateKey = '';

  try {
    // Try using OpenSSL first (more reliable)
    console.log('\n🔧 Generating certificate using OpenSSL...');
    const openSSLResult = await generatePEMCertificateWithOpenSSL({
      ...config,
      outputCertFile: undefined, // Don't save to file
      outputKeyFile: undefined  // Don't save to file
    });

    certificate = openSSLResult.certificate;
    privateKey = openSSLResult.privateKey;

    console.log(`✅ Certificate generated successfully!`);
    console.log(`📏 Certificate length: ${openSSLResult.length} characters`);
    
    if (openSSLResult.length > 10000) {
      console.log(`⚠️  Warning: Certificate length (${openSSLResult.length}) exceeds 10000 characters`);
    } else {
      console.log(`✅ Certificate length is within 10000 character limit`);
    }

  } catch (openSSLError) {
    console.log('\n🔧 OpenSSL not available, trying with node-forge...');
    
    try {
      const forgeResult = generatePEMCertificate({
        commonName: config.commonName,
        country: config.country,
        state: config.state,
        locality: config.locality,
        organization: config.organization,
        organizationalUnit: config.organizationalUnit,
        keyType: config.keyType,
        validityDays: config.validityDays
      });

      certificate = forgeResult.certificate;
      privateKey = forgeResult.privateKey;

      console.log(`✅ Certificate generated successfully with node-forge!`);
      console.log(`📏 Certificate length: ${forgeResult.certificate.length} characters`);
      
      if (forgeResult.certificate.length > 10000) {
        console.log(`⚠️  Warning: Certificate length (${forgeResult.certificate.length}) exceeds 10000 characters`);
      } else {
        console.log(`✅ Certificate length is within 10000 character limit`);
      }

    } catch (forgeError) {
      console.error('\n❌ Failed to generate certificate:', forgeError);
      process.exit(1);
    }
  }

  // Create JSON payload for different OCPP certificate operations
  const jsonPayloads = {
    // For InstallCertificate request
    installCertificate: {
      certificateType: "V2GRootCertificate",
      certificate: certificate.replace(/\n/g, '\\n')
    },

    // For CertificateSigned request
    certificateSigned: {
      certificateChain: certificate.replace(/\n/g, '\\n'),
      certificateType: "V2GCertificate"
    },

    // For SignCertificate request (CSR)
    signCertificate: {
      csr: "-----BEGIN CERTIFICATE REQUEST-----\\n[CSR_DATA_WOULD_GO_HERE]\\n-----END CERTIFICATE REQUEST-----",
      certificateType: "ChargingStationCertificate"
    },

    // Complete certificate data for general use
    certificateData: {
      certificate: certificate.replace(/\n/g, '\\n'),
      privateKey: privateKey.replace(/\n/g, '\\n'),
      certificateType: "V2GRootCertificate",
      commonName: config.commonName,
      organization: config.organization,
      validityDays: config.validityDays,
      generatedAt: new Date().toISOString()
    }
  };

  // Save JSON payloads to files
  const fs = require('fs');
  
  // Save individual payloads
  fs.writeFileSync('install-certificate-payload.json', JSON.stringify(jsonPayloads.installCertificate, null, 2));
  fs.writeFileSync('certificate-signed-payload.json', JSON.stringify(jsonPayloads.certificateSigned, null, 2));
  fs.writeFileSync('sign-certificate-payload.json', JSON.stringify(jsonPayloads.signCertificate, null, 2));
  fs.writeFileSync('certificate-data.json', JSON.stringify(jsonPayloads.certificateData, null, 2));

  console.log('\n📁 JSON Payload Files Generated:');
  console.log('   - install-certificate-payload.json');
  console.log('   - certificate-signed-payload.json');
  console.log('   - sign-certificate-payload.json');
  console.log('   - certificate-data.json');

  // Display the payloads
  console.log('\n📋 JSON Payloads:');
  console.log('==================');

  console.log('\n1️⃣ Install Certificate Payload:');
  console.log('--------------------------------');
  console.log(JSON.stringify(jsonPayloads.installCertificate, null, 2));

  console.log('\n2️⃣ Certificate Signed Payload:');
  console.log('--------------------------------');
  console.log(JSON.stringify(jsonPayloads.certificateSigned, null, 2));

  console.log('\n3️⃣ Sign Certificate Payload (template):');
  console.log('----------------------------------------');
  console.log(JSON.stringify(jsonPayloads.signCertificate, null, 2));

  console.log('\n4️⃣ Complete Certificate Data:');
  console.log('-------------------------------');
  console.log(JSON.stringify(jsonPayloads.certificateData, null, 2));

  console.log('\n💡 Usage Instructions:');
  console.log('======================');
  console.log('• Copy the JSON payload you need from above');
  console.log('• Paste it directly into your API request body');
  console.log('• The certificate data is properly escaped for JSON');
  console.log('• All files are also saved to disk for reference');

  console.log('\n🎉 JSON payload generation completed successfully!');
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});

