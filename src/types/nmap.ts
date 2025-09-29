export interface NmapRun {
  host: Host[];
}

export interface Address {
  addr: string;
  addrtype: string;
}

export interface Hostname {
  name: string;
  type: string;
}

export interface Hostnames {
  hostname: Hostname | Hostname[];
}

export interface Status {
  state: string;
  reason: string;
}

export interface Service {
  name: string;
  product?: string;
  version?: string;
  extrainfo?: string;
  method: string;
  conf: string;
  banner?: string;
}

export interface Script {
  id: string;
  output: string;
}

export interface Port {
  protocol: string;
  portid: string;
  state: Status;
  service?: Service;
  script?: Script | Script[];
}

export interface Ports {
  port: Port | Port[];
}

export interface Hostscript {
  script: Script | Script[];
}

export interface Host {
  starttime: string;
  endtime: string;
  address: Address;
  hostnames: Hostnames | Hostnames[];
  ports: Ports;
  status: Status;
  hostscript?: Hostscript;
  riskScore?: number;
  riskFactors?: string[];
}
