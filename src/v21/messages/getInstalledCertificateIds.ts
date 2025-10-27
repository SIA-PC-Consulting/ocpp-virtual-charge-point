import { z } from "zod";
import { type OcppCall, OcppIncoming } from "../../ocppMessage";
import type { VCP } from "../../vcp";
import { CertificateHashDataTypeSchema, StatusInfoTypeSchema } from "./_common";
import { generateSampleCertificateHashDataChain } from "../../utils/certUtils";

const GetInstalledCertificateIdsReqSchema = z.object({
  certificateType: z
    .array(
      z.enum([
        "V2GRootCertificate",
        "MORootCertificate",
        "CSMSRootCertificate",
        "V2GCertificateChain",
        "ManufacturerRootCertificate",
        "OEMRootCertificate",
      ]),
    )
    .nullish(),
});
type GetInstalledCertificateIdsReqType =
  typeof GetInstalledCertificateIdsReqSchema;

const GetInstalledCertificateIdsResSchema = z.object({
  status: z.enum(["Accepted", "NotFound"]),
  certificateHashDataChain: z
    .array(
      z.object({
        certificateType: z.enum([
          "V2GRootCertificate",
          "MORootCertificate",
          "CSMSRootCertificate",
          "V2GCertificateChain",
          "ManufacturerRootCertificate",
          "OEMRootCertificate",
        ]),
        certificateHashData: CertificateHashDataTypeSchema,
        childCertificateHashData: z
          .array(CertificateHashDataTypeSchema)
          .max(4)
          .nullish(),
      }),
    )
    .nullish(),
  statusInfo: StatusInfoTypeSchema.nullish(),
});
type GetInstalledCertificateIdsResType =
  typeof GetInstalledCertificateIdsResSchema;

class GetInstalledCertificateIdsOcppIncoming extends OcppIncoming<
  GetInstalledCertificateIdsReqType,
  GetInstalledCertificateIdsResType
> {
  reqHandler = async (
    vcp: VCP,
    call: OcppCall<z.infer<GetInstalledCertificateIdsReqType>>,
  ): Promise<void> => {
    // Get the requested certificate types from the request
    const requestedTypes = call.payload.certificateType;
    
    // If no certificate types are requested, return empty array
    if (!requestedTypes || requestedTypes.length === 0) {
      vcp.respond(this.response(call, { 
        status: "Accepted", 
        certificateHashDataChain: [] 
      }));
      return;
    }
    
    // Generate sample certificate hash data chain for only the requested types
    const certificateHashDataChain = generateSampleCertificateHashDataChain(requestedTypes);
    
    vcp.respond(this.response(call, { 
      status: "Accepted", 
      certificateHashDataChain: certificateHashDataChain 
    }));
  };
}

export const getInstalledCertificateIdsOcppIncoming =
  new GetInstalledCertificateIdsOcppIncoming(
    "GetInstalledCertificateIds",
    GetInstalledCertificateIdsReqSchema,
    GetInstalledCertificateIdsResSchema,
  );
