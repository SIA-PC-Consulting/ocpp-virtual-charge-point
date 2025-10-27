import { generatePEMCertificate, generatePEMCertificateWithOpenSSL } from './src/utils/certUtils';

async function main() {
  console.log('🔐 PEM-encoded X.509 Certificate Generator');
  console.log('==========================================');

  // Configuration - modify these values as needed
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

  console.log('\n📋 Configuration:');
  console.log(`   Common Name: ${config.commonName}`);
  console.log(`   Country: ${config.country}`);
  console.log(`   State: ${config.state}`);
  console.log(`   Locality: ${config.locality}`);
  console.log(`   Organization: ${config.organization}`);
  console.log(`   Organizational Unit: ${config.organizationalUnit}`);
  console.log(`   Key Type: ${config.keyType}`);
  console.log(`   Validity: ${config.validityDays} days`);

  try {
    // Try using OpenSSL first (more reliable)
    console.log('\n🔧 Generating certificate using OpenSSL...');
    const openSSLResult = await generatePEMCertificateWithOpenSSL({
      ...config,
      outputCertFile: config.outputCertFile,
      outputKeyFile: config.outputKeyFile
    });

    console.log(`✅ Certificate generated successfully!`);
    console.log(`📏 Certificate length: ${openSSLResult.length} characters`);
    
    if (openSSLResult.length > 10000) {
      console.log(`⚠️  Warning: Certificate length (${openSSLResult.length}) exceeds 10000 characters`);
    } else {
      console.log(`✅ Certificate length is within 10000 character limit`);
    }

    console.log('\n📁 Files saved:');
    console.log(`   - ${config.outputCertFile}`);
    console.log(`   - ${config.outputKeyFile}`);

    // Display certificate info
    console.log('\n📋 Certificate Information:');
    console.log(`   Format: PEM-encoded X.509`);
    console.log(`   Type: Self-signed certificate`);
    console.log(`   Key Size: 2048-bit RSA`);
    console.log(`   Valid From: ${new Date().toISOString().split('T')[0]}`);
    console.log(`   Valid Until: ${new Date(Date.now() + config.validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);

    // Display first few lines of the certificate
    console.log('\n📄 Certificate preview:');
    const certLines = openSSLResult.certificate.split('\n');
    certLines.slice(0, 8).forEach((line) => {
      console.log(`   ${line}`);
    });
    if (certLines.length > 8) {
      console.log(`   ... (${certLines.length - 8} more lines)`);
    }

    console.log('\n🎉 Certificate generation completed successfully!');

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

      console.log(`✅ Certificate generated successfully with node-forge!`);
      console.log(`📏 Certificate length: ${forgeResult.certificate.length} characters`);
      
      if (forgeResult.certificate.length > 10000) {
        console.log(`⚠️  Warning: Certificate length (${forgeResult.certificate.length}) exceeds 10000 characters`);
      } else {
        console.log(`✅ Certificate length is within 10000 character limit`);
      }

      // Save to files
      const fs = require('fs');
      fs.writeFileSync(config.outputCertFile, forgeResult.certificate);
      fs.writeFileSync(config.outputKeyFile, forgeResult.privateKey);
      
      console.log('\n📁 Files saved:');
      console.log(`   - ${config.outputCertFile}`);
      console.log(`   - ${config.outputKeyFile}`);

      console.log('\n🎉 Certificate generation completed successfully!');

    } catch (forgeError) {
      console.error('\n❌ Failed to generate certificate:', forgeError);
      process.exit(1);
    }
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});