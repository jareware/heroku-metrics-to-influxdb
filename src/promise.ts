export function withRetries<I, O>(
  label: string,
  retryCount: number,
  interval: number,
  callback: (input: I) => Promise<O>,
  logFailures = true,
) {
  return (input: I): Promise<O> => {
    let retryCounter = 0;
    return new Promise((resolve, reject) => {
      function retry() {
        callback(input).then(resolve, err => {
          if (retryCounter++ < retryCount) {
            setTimeout(retry, interval); // try again after a while
            if (logFailures) {
              console.log(
                `Warn: Operation "${label}" failed (${retryCount - retryCounter} retries remaining), due to ${
                  err.stack
                }`,
              );
            }
          } else {
            reject(err); // reject with latest error
          }
        });
      }
      retry();
    });
  };
}
