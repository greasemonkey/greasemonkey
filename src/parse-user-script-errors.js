/* Custom errors for specific problems that occur during parse-user-script */

// Base class. Should not be instantiated
class ParseError extends Error {
  constructor(msg) { super(msg); }
}


// Error thrown if duplicate resource names are found
class DuplicateResourceError extends ParseError {
  constructor(msg) {
    super(msg);
    this.name = 'DuplicateResourceError';
  }
}
