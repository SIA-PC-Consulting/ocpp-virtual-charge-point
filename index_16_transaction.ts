require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { bootNotificationOcppMessage } from "./src/v16/messages/bootNotification";
import { startTransactionOcppMessage } from "./src/v16/messages/startTransaction";
import { statusNotificationOcppMessage } from "./src/v16/messages/statusNotification";
import { stopTransactionOcppMessage } from "./src/v16/messages/stopTransaction";
import { VCP } from "./src/vcp";

const vcp = new VCP({
  endpoint: process.env.WS_URL ?? "ws://localhost:3000",
  chargePointId: process.env.CP_ID ?? "123456",
  ocppVersion: OcppVersion.OCPP_1_6,
  basicAuthPassword: process.env.PASSWORD ?? undefined,
  adminPort: Number.parseInt(process.env.ADMIN_PORT ?? "9999"),
});


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await vcp.connect();
  await sleep(2000)
  vcp.send(
    bootNotificationOcppMessage.request({
      chargePointVendor: "Solidstudio",
      chargePointModel: "VirtualChargePoint",
      chargePointSerialNumber: "S001",
      firmwareVersion: "1.0.0",
    }),
  );
  await sleep(2000)
  vcp.send(
    statusNotificationOcppMessage.request({
      connectorId: 1,
      errorCode: "NoError",
      status: "Available",
    }),
  );

  await sleep(3000)

  vcp.send(
    startTransactionOcppMessage.request({
      connectorId: 1,
      idTag: "AABBCCDD",
      meterStart: 0,
      timestamp: new Date().toISOString(),
    })
  )

  await sleep(3000)

  vcp.send(
    stopTransactionOcppMessage.request({
      idTag: "AABBCCDD",
      transactionId: 1,
      meterStop: 1000,
      timestamp: new Date().toISOString(),
    })
  )
})();
