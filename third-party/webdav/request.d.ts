import { RequestOptionsCustom, RequestOptionsWithState, Response, WebDAVClientContext, WebDAVMethodOptions } from "./types";
export declare function prepareRequestOptions(requestOptions: RequestOptionsCustom | RequestOptionsWithState, context: WebDAVClientContext, userOptions: WebDAVMethodOptions): RequestOptionsWithState;
export declare function request(requestOptions: RequestOptionsWithState): Promise<Response>;
