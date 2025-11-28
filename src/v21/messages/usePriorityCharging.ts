import { z } from "zod";
import { type OcppCall, OcppCallResult, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { StatusInfoTypeSchema } from "./_common";
import { notifyPriorityChargingOcppOutgoing } from "./notifyPriorityCharging";

const UsePriorityChargingReqSchema = z.object({
  transactionId: z.string().max(36),
  activate: z.boolean(),
});
type UsePriorityChargingReqType = typeof UsePriorityChargingReqSchema;

const UsePriorityChargingResSchema = z.object({
  status: z.enum(["Accepted", "Rejected", "NoProfile"]),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type UsePriorityChargingResType = typeof UsePriorityChargingResSchema;


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
class UsePriorityChargingOcppIncoming extends OcppIncoming<
  UsePriorityChargingReqType,
  UsePriorityChargingResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<UsePriorityChargingReqType>>,
  ): Promise<void> => {
    vcp.respond(this.response(call, { status: "Accepted" }));

    await sleep(3000);

    vcp.send(
      notifyPriorityChargingOcppOutgoing.request({
        transactionId: call.payload.transactionId,
        activated: true,
      })
    )
  };
}

export const usePriorityChargingOcppIncoming =
  new UsePriorityChargingOcppIncoming(
    "UsePriorityCharging",
    UsePriorityChargingReqSchema,
    UsePriorityChargingResSchema,
  );
