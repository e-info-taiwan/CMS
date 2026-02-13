declare module '@google-cloud/compute' {
  export const v1: {
    UrlMapsClient: new () => {
      invalidateCache: (request: unknown) => Promise<unknown>
    }
  }
}
