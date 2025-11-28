import { z } from "zod";
import { type OcppCall, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { StatusInfoTypeSchema } from "./_common";
import { reportChargingProfilesOcppOutgoing } from "./reportChargingProfiles";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const GetChargingProfilesReqSchema = z.object({
  requestId: z.number().int(),
  evseId: z.number().int().nullish(),
  chargingProfile: z.object({
    chargingProfilePurpose: z
      .enum([
        "ChargingStationExternalConstraints",
        "ChargingStationMaxProfile",
        "TxDefaultProfile",
        "TxProfile",
        "PriorityCharging",
        "LocalGeneration",
      ])
      .nullish(),
    stackLevel: z.number().int().nonnegative().nullish(),
    chargingProfileId: z.array(z.number().int()).nullish(),
    chargingLimitSource: z
      .array(z.enum(["EMS", "Other", "SO", "CSO"]))
      .max(4)
      .nullish(),
  }),
});
type GetChargingProfilesReqType = typeof GetChargingProfilesReqSchema;

const GetChargingProfilesResSchema = z.object({
  status: z.enum(["Accepted", "NoProfiles"]),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type GetChargingProfilesResType = typeof GetChargingProfilesResSchema;

class GetChargingProfilesOcppIncoming extends OcppIncoming<
  GetChargingProfilesReqType,
  GetChargingProfilesResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<GetChargingProfilesReqType>>,
  ): Promise<void> => {
    vcp.respond(this.response(call, { status: "Accepted" }));

    await sleep(3000);

    vcp.send(
      reportChargingProfilesOcppOutgoing.request({
        requestId: call.payload.requestId,
        chargingLimitSource: "EMS",
        tbc: true,
        evseId: call.payload.evseId ?? 1,
        chargingProfile: [
          {
            id: 1,
            stackLevel: 1,
            chargingProfilePurpose: "ChargingStationExternalConstraints",
            chargingProfileKind: "Absolute",
            validFrom: new Date().toISOString(),
            transactionId: undefined,
            chargingSchedule: [
              {
                id: 101,
                startSchedule: new Date().toISOString(),
                duration: 3600,
                chargingRateUnit: "W",
                minChargingRate: 1,
                chargingSchedulePeriod: [
                  {
                    startPeriod: 0,
                    limit: 10,
                    numberPhases: 3,
                    phaseToUse: 1,
                  },
                ],
                salesTariff: undefined,
              },
            ],
          },
        ],
      })
    );

    await sleep(3000);
    vcp.send(
      reportChargingProfilesOcppOutgoing.request({
        requestId: call.payload.requestId,
        chargingLimitSource: "Other",
        tbc: false,
        evseId: call.payload.evseId ?? 2,
        chargingProfile: [
          {
            id: 2,
            stackLevel: 2,
            chargingProfilePurpose: "TxProfile",
            chargingProfileKind: "Recurring",
            validFrom: new Date(Date.now() + 60000).toISOString(),
            validTo: new Date(Date.now() + 100000).toISOString(),
            recurrencyKind: "Daily",
            transactionId: "tx-2222",
            chargingSchedule: [
              {
                id: 202,
                startSchedule: new Date(Date.now() + 60000).toISOString(),
                duration: 1800,
                chargingRateUnit: "A",
                minChargingRate: 2,
                chargingSchedulePeriod: [
                  {
                    startPeriod: 0,
                    limit: 5,
                    numberPhases: 1,
                    phaseToUse: 2,
                  },
                  {
                    startPeriod: 1800,
                    limit: 1,
                    numberPhases: 1,
                    phaseToUse: 1,
                  }
                ],
                salesTariff: undefined,
              },
            ],
          },
        ],
      })
    )
  };
}

export const getChargingProfilesOcppIncoming =
  new GetChargingProfilesOcppIncoming(
    "GetChargingProfiles",
    GetChargingProfilesReqSchema,
    GetChargingProfilesResSchema,
  );
