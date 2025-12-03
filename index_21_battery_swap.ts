require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { batterySwapOcppOutgoing } from "./src/v21/messages/batterySwap";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { securityEventNotificationOcppOutgoing } from "./src/v21/messages/securityEventNotification";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { VCP } from "./src/vcp";

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

  await sleep(5001);

  vcp.send(
    securityEventNotificationOcppOutgoing.request({
      type: "SecurityEvent",
      timestamp: new Date().toISOString(),
    })
  );

  await sleep(4000);

  vcp.send(
    batterySwapOcppOutgoing.request({
      eventType: "BatteryIn",
      requestId: 1,
      idToken: {
        idToken: "AABBCCDD",
        type: "ISO14443",
      },
      batteryData: [
        {
          evseId: 1,
          serialNumber: "BAT001",
          soC: 85,
          soH: 92,
          productionDate: "2023-01-15T00:00:00Z",
          vendorInfo: "Battery Manufacturer XYZ",
        },
      ],
    })
  )
})();
