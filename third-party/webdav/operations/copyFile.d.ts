import { WebDAVClientContext, WebDAVMethodOptions } from "../types";
export declare function copyFile(context: WebDAVClientContext, filename: string, destination: string, options?: WebDAVMethodOptions): Promise<void>;
