import { FileStat, ResponseDataDetailed, StatOptions, WebDAVClientContext } from "../types";
export declare function getStat(context: WebDAVClientContext, filename: string, options?: StatOptions): Promise<FileStat | ResponseDataDetailed<FileStat>>;
