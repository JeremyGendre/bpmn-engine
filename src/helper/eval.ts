export function sanitizeEval(input: string): string {
  // Whitelist of allowed characters and operators
  const allowedChars = /^[a-zA-Z0-9_.=!&()|?' ]+$/;
  // Check if the condition string contains only allowed characters
  if (!allowedChars.test(input)) {
    throw new Error('Invalid characters in condition string.');
  }
  // Check for any potentially harmful keywords or functions
  const blacklistedKeywords = ['eval', 'require', 'import', 'Function', 'delete', 'push', 'function', '()', '=>'];
  blacklistedKeywords.forEach(keyword => {
    if (input.includes(keyword)) {
      throw new Error(`Forbidden keyword or function "${keyword}" in condition string.`);
    }
  });
  // Check for invalid assignment operations
  const allowedPrevious = ['=', '!', '<', '>']
  const allowedNext = ['=']
  for (let i = 0; i < input.length; i++) {
    // Check for assignment operator
    if (input[i] === '=') {
      // Check if the previous and the next characters are not allowed characters
      if (!(allowedPrevious.includes(input[i - 1])) && !(allowedNext.includes(input[i + 1]))) {
        throw new Error('Invalid assignment operation in condition string.');
      }
    }
  }


  return input;
}