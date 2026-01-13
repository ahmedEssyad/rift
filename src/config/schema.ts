export interface Service {
  name: string;
  path: string;
  framework: string;
  run: string;
  build?: string;
  test?: string;
  install?: string;
  port?: number;
  depends_on?: string[];
  env?: Record<string, string>;
}

export interface RiftConfig {
  version: number;
  services: Service[];
}
