import { AttributeValue } from "aws-lambda";

interface DynamoRecord {
  [key: string]: AttributeValue;
}

export function deserializeData(
  newRecord: DynamoRecord,
  keys: string[]
): Record<string, string> {
  return keys.reduce(
    (prev, curr) => ({ ...prev, [curr]: newRecord[curr].S as string }),
    {}
  );
}
