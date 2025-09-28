const getAllFields = schema => {
  const paths = new Set();

  schema.eachPath((path, type) => {
    if (type.schema) {
      const embeddedFields = getAllFields(type.schema).map(field => `${path}.${field}`);
      embeddedFields.forEach(field => paths.add(field));
    } else {
      paths.add(path);
    }
  });

  Object.keys(schema.paths).forEach(path => paths.add(path));

  return Array.from(paths);
};

module.exports = getAllFields;
