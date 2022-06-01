import { CreateDirectoryOptions, WebDAVClientContext } from "../types";
export declare function createDirectory(context: WebDAVClientContext, dirPath: string, options?: CreateDirectoryOptions): Promise<void>;
