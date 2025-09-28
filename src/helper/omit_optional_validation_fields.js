module.exports = fieldsToOmit => (req, res, next) => {
  fieldsToOmit.forEach(field => {
    // The purpose of this function is to set the optional fields
    // that the user set to null or '' in order to delete it to undefined
    // so the express validator in the next middleware does not check it .
    if (req.body[field] === null || req.body[field] === '') {
      req.body[field] = undefined;
    }
  });
  next();
};
