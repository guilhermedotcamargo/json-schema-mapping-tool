// Define a TypeScript interface 'MappingRequest' with 'source' and 'target' as objects. Define 'MappingResponse' as an array of objects containing 'sourceKey' (string), 'targetKey' (string), and 'confidence' (number).
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import stringSimilarity from 'string-similarity';

interface MappingRequest {
  source: Record<string, any>;
  target: Record<string, any>;
}

interface MappingResponseItem {
  sourceKey: string;
  targetKey: string;
  confidence: number;
}
type MappingResponse = MappingResponseItem[];

// Create an Express server in TypeScript. Add a POST route '/map' using the MappingRequest interface. Implement a recursive function 'flattenKeys' that returns all nested keys of an object as dot-notation strings. Use 'string-similarity' to compare keys and return the MappingResponse.
const app = express();
app.use(cors());
app.use(bodyParser.json());

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      acc.push(...flattenKeys(obj[key], fullKey));
    } else {
      acc.push(fullKey);
    }
    return acc;
  }, [] as string[]);
}

// POST /map route implementation
app.post('/map', (req, res) => {
  const { source, target }: MappingRequest = req.body;
  if (!source || !target) {
    return res.status(400).json({ error: 'Missing source or target in request body.' });
  }
  const sourceKeys = flattenKeys(source);
  const targetKeys = flattenKeys(target);

  const mappings: MappingResponse = [];
  for (const sKey of sourceKeys) {
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(sKey, targetKeys);
    mappings.push({
      sourceKey: sKey,
      targetKey: bestMatch.target,
      confidence: bestMatch.rating
    });
  }
  res.json(mappings);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
