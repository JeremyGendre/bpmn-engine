import { XMLParser } from 'fast-xml-parser';

const options = {
    ignoreAttributes : false
};

const xmlDataStr = '<root>ouais ok</root>';
const parser = new XMLParser(options);
const jsonObj = parser.parse(xmlDataStr);

console.log(jsonObj);
