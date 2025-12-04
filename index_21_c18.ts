require("dotenv").config();

import * as uuid from "uuid";
import { OcppVersion } from "./src/ocppVersion";
import { authorizeOcppOutgoing } from "./src/v21/messages/authorize";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { notifyEventOcppOutgoing } from "./src/v21/messages/notifyEvent";
import { securityEventNotificationOcppOutgoing } from "./src/v21/messages/securityEventNotification";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { transactionEventOcppOutgoing } from "./src/v21/messages/transactionEvent";
import { VCP } from "./src/vcp";
import { notifySettlementOcppOutgoing } from "./src/v21/messages/notifySettlement";

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

  // Boot message
  vcp.send(
    bootNotificationOcppOutgoing.request({
      reason: "PowerUp",
      chargingStation: {
        model: "VirtualChargePoint",
        vendorName: "Solidstudio",
      },
    })
  );

  // Show aviable connectors
  await sleep(5001);
  vcp.send(
    notifyEventOcppOutgoing.request({
      generatedAt: new Date().toISOString(),
      tbc: false,
      seqNo: 0,
      eventData: [
        {
          eventId: Math.floor(Math.random() * 1000000),
          timestamp: new Date().toISOString(),
          trigger: "Alerting",
          actualValue: "Available",
          eventNotificationType: "PreconfiguredMonitor",
          component: {
            name: "Connector",
            evse: {
              id: 1,
              connectorId: 1,
            },
          },
          variable: {
            name: "AvailabilityState",
          },
        },
        {
          eventId: Math.floor(Math.random() * 1000001),
          timestamp: new Date().toISOString(),
          trigger: "Alerting",
          actualValue: "Available",
          eventNotificationType: "PreconfiguredMonitor",
          component: {
            name: "Connector",
            evse: {
              id: 1,
              connectorId: 2,
            },
          },
          variable: {
            name: "AvailabilityState",
          },
        },
      ],
    })
  );

  await sleep(5001);
  vcp.send(
    notifySettlementOcppOutgoing.request({
      pspRef: "PAYMENT_REF_123456789",
      status: "Settled",
      settlementAmount: 15.5,
      settlementTime: "2025-01-27T10:30:00.000Z",
    })
  );

  await sleep(5001);
  vcp.send(
    authorizeOcppOutgoing.request({
      idToken: {
        idToken: "PAYMENT_REF_123456789",
        type: "DirectPayment",
      },
    })
  );

})();
