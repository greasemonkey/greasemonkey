import { DiskQuota, GetQuotaOptions, ResponseDataDetailed, WebDAVClientContext } from "../types";
export declare function getQuota(context: WebDAVClientContext, options?: GetQuotaOptions): Promise<DiskQuota | null | ResponseDataDetailed<DiskQuota | null>>;
