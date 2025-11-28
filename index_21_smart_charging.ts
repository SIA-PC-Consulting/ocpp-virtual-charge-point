require("dotenv").config();

import { OcppVersion } from "./src/ocppVersion";
import { bootNotificationOcppOutgoing } from "./src/v21/messages/bootNotification";
import { securityEventNotificationOcppOutgoing } from "./src/v21/messages/securityEventNotification";
import { statusNotificationOcppOutgoing } from "./src/v21/messages/statusNotification";
import { transactionEventOcppOutgoing } from "./src/v21/messages/transactionEvent";
import { authorizeOcppOutgoing } from "./src/v21/messages/authorize";
import { meterValuesOcppOutgoing } from "./src/v21/messages/meterValues";
import { VCP } from "./src/vcp";
import { notifyChargingLimitOcppOutgoing } from "./src/v21/messages/notifyChargingLimit";
import { notifyEVChargingNeedsOcppOutgoing } from "./src/v21/messages/notifyEVChargingNeeds";
import { notifyEVChargingScheduleOcppOutgoing } from "./src/v21/messages/notifyEVChargingSchedule";

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
const testCase = process.env.TEST_CASE ?? "K01";

const testCases: Record<string, () => Promise<void>> = {
  K01: async () => {
    // Start transaction to be able to reference it in SetChargingProfile request
    await sleep(2000);
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
    );
  
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
    );
  },
  K08: async () => {
    // Do nothing, we are just testing GetCompositeSchedule
  },
  K12: async () => {
    await sleep(3000);
    vcp.send(
      notifyChargingLimitOcppOutgoing.request({
      chargingLimit: {
        chargingLimitSource: "EMS",
        isGridCritical: false,
      },
      evseId: 1,
      chargingSchedule: [
        {
          id: 101,
          startSchedule: new Date().toISOString(),
          duration: 3600,
          chargingRateUnit: "W",
          minChargingRate: 5,
          chargingSchedulePeriod: [
            {
              startPeriod: 0,
              limit: 10,
              numberPhases: 3,
              phaseToUse: 1,
            },
            {
              startPeriod: 1800,
              limit: 8,
              numberPhases: 3,
              phaseToUse: 1,
            }
          ],
        },
      ]
      })
    )
  },
  K15: async () => {
    await sleep(3000);
        // Start transaction to be able to reference it in SetChargingProfile request
        await sleep(2000);
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
        );
      
        await sleep(3000)
  
        vcp.send(
          notifyEVChargingNeedsOcppOutgoing.request({
            evseId: 1,
            chargingNeeds: {
              requestedEnergyTransfer: "AC_three_phase",
              departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
              acChargingParameters: {
                energyAmount: 12000, // in Wh
                evMaxVoltage: 230, // in V
                evMaxCurrent: 32, // in A
                evMinCurrent: 6, // in A
              }
            },
            maxScheduleTuples: 3,
            timestamp: new Date().toISOString()
          })
        )

        await sleep(5000);

        // Assume CSMS sent charging profile request

        // EV Provides charging schedule
        vcp.send(
          notifyEVChargingScheduleOcppOutgoing.request({
            timeBase: new Date().toISOString(),
            evseId: 1,
            chargingSchedule: {
              id: 20,
              startSchedule: new Date().toISOString(),
              duration: 3600, // Duration in seconds (1 hour)
              chargingRateUnit: "W",
              chargingSchedulePeriod: [
                {
                  startPeriod: 0,
                  limit: 7000, // Power in W for first period
                  numberPhases: 3,
                },
                {
                  startPeriod: 1800,
                  limit: 3500, // Reduce power after 30 minutes
                  numberPhases: 3,
                },
                {
                  startPeriod: 3300,
                  limit: 1000, // Reduce even more for last 5 minutes
                  numberPhases: 3,
                },
              ],
              minChargingRate: 1000,
            }
          })
        )
  },
  K21: async () => {
    // Start transaction to be able to reference it in UsePriorityCharging Request
    await sleep(2000);
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
    );
  
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
    );
  },
};

(async () => {

  console.log("Running Test Case: ", testCase);
  console.log("--------------------------------");

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
  const testFn = testCases[testCase];
  if (!testFn) {
    throw new Error(`Unknown test case: ${testCase}`);
  }
  await testFn();
})();
