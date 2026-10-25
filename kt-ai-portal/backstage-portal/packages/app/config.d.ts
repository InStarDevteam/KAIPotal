export interface Config {
  app: {
    /** Customer design review selector, independent of API data mode. @visibility frontend */
    designReviewEnabled?: boolean;
    /**
     * Optional demo access code for the preview auth gate.
     * @visibility frontend
     */
    previewAccessCode?: string;

    /**
     * If true, only the Guest auth provider is shown in the demo.
     * @visibility frontend
     */
    previewAuthEnabled?: boolean;

    /**
     * Firebase client configuration for the demo login gate.
     * @visibility frontend
     */
    firebase?: {
      /** @visibility frontend */
      apiKey?: string;
      /** @visibility frontend */
      authDomain?: string;
      /** @visibility frontend */
      projectId?: string;
      /** @visibility frontend */
      appId?: string;
    };

    /**
     * Demo access control: comma-separated allowed emails and domains.
     * @visibility frontend
     */
    auth?: {
      /** @visibility frontend */
      allowedEmails?: string;
      /** @visibility frontend */
      allowedDomains?: string;
      /** @visibility frontend */
      adminEmails: string;
    };

    /**
     * Proposal capture mode: enables the role preview switcher.
     * @visibility frontend
     */
    proposalCapture?: {
      /** @visibility frontend */
      enabled: boolean;
      /** @visibility frontend */
      allowedRoles?: string;
    };
  };
}
