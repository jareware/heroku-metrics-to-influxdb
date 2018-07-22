// Note: This assumes a Lambda that's ran according to a schedule, and thus can't send responses
export interface LambdaHandlers {
  handler: (event: any, context: any, callback: (error: Error | null) => void) => void;
}
