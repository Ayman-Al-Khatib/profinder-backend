const translate = require('../helper/translate');

class ApiError extends Error {
  constructor(messages, statusCode, { merge = false, data = null } = {}) {
    let errorMessages;

    if (Array.isArray(messages)) {
      errorMessages = messages.map(msg => translate(msg));
    } else {
      errorMessages = [translate(messages)];
    }

    if (Array.isArray(messages) && merge === true) {
      errorMessages = [errorMessages.join(' ')];
    }
    super(errorMessages);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? 'failure' : 'error';
    this.data = data;
    this.msg = errorMessages;
  }
}

module.exports = ApiError;
