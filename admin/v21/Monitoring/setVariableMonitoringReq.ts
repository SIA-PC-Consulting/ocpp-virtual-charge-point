import * as uuid from "uuid";
import { sendAdminCommand } from "../../admin";

sendAdminCommand({
  action: "SetVariableMonitoring",
  messageId: uuid.v4(),
  payload: {
    setMonitoringData: {
        value: 0.1,
        type: 'UpperThreshold',
        severity: 9,
        component: {
            name: 'Connector'
        },
        variable: {
            name: 'Present'
        }
    },
  },
});
