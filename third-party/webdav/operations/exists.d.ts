import { WebDAVClientContext, WebDAVMethodOptions } from "../types";
export declare function exists(context: WebDAVClientContext, remotePath: string, options?: WebDAVMethodOptions): Promise<boolean>;
