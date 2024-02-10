import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

// @Doc : https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md
const options = {
    ignoreAttributes : false,
    attributeNamePrefix : '',
    attributesGroupName: 'attributes',
};

//open xml file
const xmlDataStr = fs.readFileSync('./resources/internal-validation-test.bpmn', 'utf8');

const parser = new XMLParser(options);
const jsonObj = parser.parse(xmlDataStr);

const definitions = jsonObj['bpmn:definitions'];
const processes = definitions['bpmn:process'];
const signals = definitions['bpmn:signal'];

console.log('processes', processes);
// console.log('oui', processes['bpmn:sequenceFlow']);
console.log('signals', signals);
