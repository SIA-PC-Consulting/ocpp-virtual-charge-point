import { z } from "zod";
import { type OcppCall, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { notifyMonitoringReportOcppOutgoing } from "./notifyMonitoringReport";
import {
  ComponentTypeSchema,
  StatusInfoTypeSchema,
  VariableTypeSchema,
} from "./_common";

const GetMonitoringReportReqSchema = z.object({
  requestId: z.number().int(),
  monitoringCriteria: z
    .array(
      z.enum(["ThresholdMonitoring", "DeltaMonitoring", "PeriodicMonitoring"]),
    )
    .max(3)
    .nullish(),
  componentVariable: z
    .array(
      z.object({
        component: ComponentTypeSchema,
        variable: VariableTypeSchema.nullish(),
      }),
    )
    .nullish(),
});
type GetMonitoringReportReqType = typeof GetMonitoringReportReqSchema;

const GetMonitoringReportResSchema = z.object({
  status: z.enum(["Accepted", "Rejected", "NotSupported", "EmptyResultSet"]),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type GetMonitoringReportResType = typeof GetMonitoringReportResSchema;

class GetMonitoringReportOcppIncoming extends OcppIncoming<
  GetMonitoringReportReqType,
  GetMonitoringReportResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<GetMonitoringReportReqType>>,
  ): Promise<void> => {
    // Respond with Accepted status
    vcp.respond(this.response(call, { status: "Accepted" }));

    // Send NotifyMonitoringReportRequest with sample monitoring data
    const notifyMonitoringReportRequest = notifyMonitoringReportOcppOutgoing.request({
      requestId: call.payload.requestId,
      tbc: false,
      seqNo: 1,
      generatedAt: new Date().toISOString(),
      monitor: [
        {
          component: {
            name: "Controller",
            instance: "MainController"
          },
          variable: {
            name: "HeartbeatInterval"
          },
          variableMonitoring: [
            {
              id: 1,
              transaction: false,
              value: 300,
              type: "Periodic",
              severity: 5,
              eventNotificationType: "PreconfiguredMonitor"
            }
          ]
        }
      ]
    });

    vcp.send(notifyMonitoringReportRequest);
  };
}

export const getMonitoringReportOcppIncoming =
  new GetMonitoringReportOcppIncoming(
    "GetMonitoringReport",
    GetMonitoringReportReqSchema,
    GetMonitoringReportResSchema,
  );
