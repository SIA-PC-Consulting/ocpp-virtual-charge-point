import { z } from "zod";
import { type OcppCall, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { StatusInfoTypeSchema } from "./_common";
import { notifyDisplayMessagesOcppOutgoing } from "./notifyDisplayMessages";

const GetDisplayMessagesReqSchema = z.object({
  id: z.array(z.coerce.number().int()).nullish(),
  requestId: z.coerce.number().int(),
  priority: z.enum(["AlwaysFront", "InFront", "NormalCycle"]).nullish(),
  state: z
    .enum([
      "Charging",
      "Faulted",
      "Idle",
      "Unavailable",
      "Suspended",
      "Discharging",
    ])
    .nullish(),
});
type GetDisplayMessagesReqType = typeof GetDisplayMessagesReqSchema;

const GetDisplayMessagesResSchema = z.object({
  status: z.enum(["Accepted", "Unknown"]),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type GetDisplayMessagesResType = typeof GetDisplayMessagesResSchema;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class GetDisplayMessagesOcppIncoming extends OcppIncoming<
  GetDisplayMessagesReqType,
  GetDisplayMessagesResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<GetDisplayMessagesReqType>>,
  ): Promise<void> => {
    vcp.respond(this.response(call, { status: "Accepted" }));

    // Notify display messages
    await sleep(5001);

    vcp.send(
      notifyDisplayMessagesOcppOutgoing.request({
        requestId: 1,
        tbc: false,
        messageInfo: [
          {
            id: 1,
            priority: "NormalCycle",
            state: "Idle",
            startDateTime: new Date().toISOString(),
            endDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            message: {
              format: "UTF8",
              language: "en",
              content: "Welcome to the charging station",
            },
            display: {
              name: "MainDisplay",
              instance: "Display1",
              evse: {
                id: 1,
                connectorId: 1,
              },
            },
            messageExtra: [
              {
                format: "ASCII",
                content: "Additional information",
              },
            ],
          },
        ],
      })
    );
  };
}

export const getDisplayMessagesOcppIncoming =
  new GetDisplayMessagesOcppIncoming(
    "GetDisplayMessages",
    GetDisplayMessagesReqSchema,
    GetDisplayMessagesResSchema,
  );
