import { z } from "zod";
import { type OcppCall, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { StatusInfoTypeSchema } from "./_common";
import { firmwareStatusNotificationOcppOutgoing } from "./firmwareStatusNotification";

const UpdateFirmwareReqSchema = z.object({
  retries: z.number().int().nullish(),
  retryInterval: z.number().int().nullish(),
  requestId: z.number().int(),
  firmware: z.object({
    location: z.string().max(2000),
    retrieveDateTime: z.string().datetime(),
    installDateTime: z.string().datetime().nullish(),
    signingCertificate: z.string().max(5500).nullish(),
    signature: z.string().max(800).nullish(),
  }),
});
type UpdateFirmwareReqType = typeof UpdateFirmwareReqSchema;

const UpdateFirmwareResSchema = z.object({
  status: z.enum([
    "Accepted",
    "Rejected",
    "AcceptedCanceled",
    "InvalidCertificate",
    "RevokedCertificate",
  ]),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type UpdateFirmwareResType = typeof UpdateFirmwareResSchema;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class UpdateFirmwareOcppIncoming extends OcppIncoming<
  UpdateFirmwareReqType,
  UpdateFirmwareResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<UpdateFirmwareReqType>>,
  ): Promise<void> => {
    // 2. The Charging station responds with an UpdateFirmwareResponse
    vcp.respond(this.response(call, { status: "Accepted" }));

    // 3. The Charging station sends a FirmwareStatusNotificationRequest with status Downloading
    await sleep(1000);
    vcp.send(
      firmwareStatusNotificationOcppOutgoing.request({
        status: "Downloading",
        requestId: call.payload.requestId,
        statusInfo: {
          reasonCode: "Downloading",
          additionalInfo: "Firmware download in progress",
        },
      })
    );

    // 4. The CSMS responds with a FirmwareStatusNotificationResponse (handled automatically)

    // 5. The Charging station sends a FirmwareStatusNotificationRequest with status Downloaded
    await sleep(5000);
    vcp.send(
      firmwareStatusNotificationOcppOutgoing.request({
        status: "Downloaded",
        requestId: call.payload.requestId,
        statusInfo: {
          reasonCode: "Downloaded",
          additionalInfo: "Firmware download completed successfully",
        },
      })
    );

    // 6. The CSMS responds with a FirmwareStatusNotificationResponse (handled automatically)

    // 7. The Charging station sends a FirmwareStatusNotificationRequest with status Installing
    await sleep(1000);
    vcp.send(
      firmwareStatusNotificationOcppOutgoing.request({
        status: "Installing",
        requestId: call.payload.requestId,
        statusInfo: {
          reasonCode: "Installing",
          additionalInfo: "Firmware installation in progress",
        },
      })
    );

    // 8. The CSMS responds with a FirmwareStatusNotificationResponse (handled automatically)

    // 9. The Charging station sends a FirmwareStatusNotificationRequest with status Installed
    await sleep(5000);
    vcp.send(
      firmwareStatusNotificationOcppOutgoing.request({
        status: "Installed",
        requestId: call.payload.requestId,
        statusInfo: {
          reasonCode: "Installed",
          additionalInfo: "Firmware installation completed successfully",
        },
      })
    );

    // 10. The CSMS responds with a FirmwareStatusNotificationResponse (handled automatically)
  };
}

export const updateFirmwareOcppIncoming = new UpdateFirmwareOcppIncoming(
  "UpdateFirmware",
  UpdateFirmwareReqSchema,
  UpdateFirmwareResSchema,
);
