function recursiveKeyPrefixTransform(input, prefix) {
  const transformed = {};

  for (const key in input) {
    if (typeof input[key] === 'object' && input[key] !== null) {
      const nestedTransformed = recursiveKeyPrefixTransform(input[key], `${prefix}.${key}`);
      Object.assign(transformed, nestedTransformed);
    } else {
      transformed[`${prefix}.${key}`] = input[key];
    }
  }
  return transformed;
}

module.exports = recursiveKeyPrefixTransform;
