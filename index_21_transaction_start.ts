require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { authorizeOcppOutgoing } from "./src/v21/messages/authorize";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { meterValuesOcppOutgoing } from "./src/v21/messages/meterValues";
import { securityEventNotificationOcppOutgoing } from "./src/v21/messages/securityEventNotification";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { transactionEventOcppOutgoing } from "./src/v21/messages/transactionEvent";
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
    transactionEventOcppOutgoing.request({
      eventType: "Started",
      timestamp: new Date().toISOString(),
      seqNo: 0,
      triggerReason: "CablePluggedIn",
      transactionInfo: {
        transactionId: "123456",
      },
      evse: {
        id: 1,
        connectorId: 1,
      },
    })
  );

  await sleep(3000)
  vcp.send(
    authorizeOcppOutgoing.request({
      idToken: {
        idToken: "AABBCCDD",
        type: "Local"
      }
    })
  );

  await sleep(3000)

  vcp.send(
    transactionEventOcppOutgoing.request({
      eventType: "Updated",
      timestamp: new Date().toISOString(),
      seqNo: 1,
      triggerReason: "Authorized",
      idToken: {
        idToken: "AABBCCDD",
        type: "Local"
      },
      transactionInfo: {
        chargingState: "Charging",
        transactionId: "123456",
      },
    })
  )

  await sleep(3000)

  vcp.send(
    meterValuesOcppOutgoing.request({
      evseId: 1,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: 1000,
              measurand: "Energy.Active.Import.Register",
              unitOfMeasure: {
                unit: "kWh",
              },
            },
          ],
        }
      ]
    })
  )
})();
