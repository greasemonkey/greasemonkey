import { WebDAVClientContext, WebDAVMethodOptions } from "../types";
export declare function moveFile(context: WebDAVClientContext, filename: string, destination: string, options?: WebDAVMethodOptions): Promise<void>;
