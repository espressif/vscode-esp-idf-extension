export class RainmakerAPIClient {
  private accessToken: string;

  public static login(username: string, password: string): string {
    return null;
  }
  public static isLoggedIn(): boolean {
    return false;
  }

  constructor(accessToken: string) {}
  public refreshAccessToken(refreshToken: string) {}

  //nodes
  public getAllUserAssociatedNodes() {}
  public getNodeConfigurationFor(nodeId: string) {}
  public isNodeOnline(): boolean {
    return false;
  }

  //nodes operations
  public updateNodeState() {}
  public getNodeState() {}
}
