require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { dataTransferOcppOutgoing } from "./src/v21/messages/dataTransfer";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { VCP } from "./src/vcp";
import { v4 as uuidv4 } from 'uuid';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const vcp = new VCP({
  endpoint: process.env.WS_URL ?? "ws://localhost:3000",
  chargePointId: process.env.CP_ID ?? "123456",
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
    })
  );
  await sleep(5001);
  vcp.send(
    statusNotificationOcppOutgoing.request({
      evseId: 1,
      connectorId: 1,
      connectorStatus: "Available",
      timestamp: new Date().toISOString(),
    })
  );

  // Accepted
  await sleep(5001);
  vcp.send(
    dataTransferOcppOutgoing.request({
      vendorId: "ANT",
      messageId: uuidv4(),
      data: {
        action: "CustomAction",
      },
    })
  );

  // NotImplemented
  await sleep(5001);
  vcp.send(
    dataTransferOcppOutgoing.request({
      vendorId: "ENG",
      messageId: uuidv4(),
      data: {
        action: "CustomAction",
      },
    })
  );
})();
