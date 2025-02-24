import { FileStat, Response, ResponseDataDetailed, WebDAVClientContext } from "./types";
export declare function createErrorFromResponse(response: Response, prefix?: string): Error;
export declare function handleResponseCode(context: WebDAVClientContext, response: Response): Response;
export declare function processGlobFilter(files: Array<FileStat>, glob: string): Array<FileStat>;
export declare function processResponsePayload<T>(response: Response, data: T, isDetailed?: boolean): ResponseDataDetailed<T> | T;
