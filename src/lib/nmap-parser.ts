
'use server';

import { XMLParser } from 'fast-xml-parser';
import type { Host } from '@/types/nmap';

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  parseNodeValue: true,
  parseAttributeValue: true,
  trimValues: true,
  // This is crucial for handling cases where an element can appear once or multiple times
  isArray: (name: string, jpath: string) => {
    const arrayPaths = [
      'nmaprun.host',
      'nmaprun.host.ports.port',
      'nmaprun.host.hostnames.hostname',
      'nmaprun.host.ports.port.script',
      'nmaprun.host.hostscript.script',
      'nmaprun.host.os.osmatch',
    ];
    return arrayPaths.indexOf(jpath) !== -1;
  },
};

export async function parseNmapXml(xmlData: string): Promise<Host[]> {
  try {
    const parser = new XMLParser(options);
    const jsonObj = parser.parse(xmlData);

    if (!jsonObj.nmaprun || !jsonObj.nmaprun.host) {
      return [];
    }

    // The isArray option ensures `jsonObj.nmaprun.host` is always an array
    return jsonObj.nmaprun.host as Host[];
  } catch (error) {
    console.error('XML Parsing Error:', error);
    throw new Error('Failed to parse Nmap XML. Please check the file format.');
  }
}
