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
import { generateExiRequest, generateStaticExiRequest } from './src/utils/exiRequestGenerator';

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

  // Generate EXI request for certificate installation
  // Option 1: Use static pre-generated request (faster, for testing)
  const exiRequest = generateStaticExiRequest();
  
  // Option 2: Generate a new EXI request dynamically (uncomment to use)
  // const exiRequest = await generateExiRequest({
  //   commonName: process.env.CP_ID ?? 'TEST-001',
  //   organizationalUnit: 'HUBOpenProvCert201',
  //   keyType: 'ECC',
  //   country: 'DE',
  //   state: 'Bavaria',
  //   locality: 'Munich',
  //   organization: 'Test'
  // });

  console.log(`\n📦 Generated EXI Request (${exiRequest.length} characters)`);
  console.log(`Preview: ${exiRequest.substring(0, 100)}...\n`);

  vcp.send(
    get15118EVCertificateOcppOutgoing.request({
      iso15118SchemaVersion: "urn:iso:15118:20:2022:MsgDef",
      action: "Install",
      exiRequest,
      maximumContractCertificateChains: 1,
      // prioritizedEMAIDs: ["1234567890"],
    }),
  )
})();
