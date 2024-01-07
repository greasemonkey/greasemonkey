import { FileStat, GetDirectoryContentsOptions, ResponseDataDetailed, WebDAVClientContext } from "../types";
export declare function getDirectoryContents(context: WebDAVClientContext, remotePath: string, options?: GetDirectoryContentsOptions): Promise<Array<FileStat> | ResponseDataDetailed<Array<FileStat>>>;
