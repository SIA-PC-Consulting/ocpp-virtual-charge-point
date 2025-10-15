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
  // vcp.send(
  //   statusNotificationOcppOutgoing.request({
  //     evseId: 1,
  //     connectorId: 1,
  //     connectorStatus: "Available",
  //     timestamp: new Date().toISOString(),
  //   }),
  // );
  vcp.send(
    notifyEventOcppOutgoing.request({
      generatedAt: new Date().toISOString(),
      tbc: false,
      seqNo: 0,
      eventData: [{
        eventId: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString(),
        trigger: 'Alerting',
        actualValue: "Occupied",
        eventNotificationType: 'PreconfiguredMonitor',
        component: {
          name: 'Connector',
          evse: {
            id: 1,
            connectorId: 1,
          },
        },
        variable: {
          name: 'AvailabilityState'
        }
      }]
    }),
  );
  
  await sleep(3000);
  vcp.send(
    openPeriodicEventStreamOcppOutgoing.request({
      constantStreamData: {
        id: 1,
        variableMonitoringId: 1,
        params: {
          interval: 10,
          values: 1,
        },
      },
    })
  );

  await sleep(10000);
  vcp.send(
    notifyPeriodicEventStreamOcppOutgoing.request({
      id: 1,
      pending: 0,
      basetime: new Date().toISOString(),
      data: [
        {
          t: 10,
          v: "10",
        },
        {
          t: 20,
          v: "20",
        }
      ]
    })
  );

  // await sleep(10000);
  // vcp.send(
  //   closePeriodicEventStreamOcppOutgoing.request({
  //     id: 1
  //   })
  // );
})();
