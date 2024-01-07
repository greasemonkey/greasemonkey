import { RequestOptionsCustom, Response, WebDAVClientContext } from "../types";
export declare function customRequest(context: WebDAVClientContext, remotePath: string, requestOptions: RequestOptionsCustom): Promise<Response>;
