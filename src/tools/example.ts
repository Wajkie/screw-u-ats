export interface EchoResult {
  message: string;
  reversed: string;
  length: number;
}

export function echo(message: string): EchoResult {
  return {
    message,
    reversed: message.split("").reverse().join(""),
    length: message.length,
  };
}

export interface AddResult {
  a: number;
  b: number;
  sum: number;
}

export function add(a: number, b: number): AddResult {
  return { a, b, sum: a + b };
}
