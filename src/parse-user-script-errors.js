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


// Error to throw if relative resources are found without a valid downloadUrl
class InvalidRemoteUrl extends ParseError {
  constructor(resourceType, url) {
    super(
        _('Invalid $1 URL ($2).\nScript missing `@downloadUrl`?',
          resourceType,
          url)
    );
    this.name = 'InvalidRemoteUrl';
  }
}
