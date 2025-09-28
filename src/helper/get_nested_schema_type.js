module.exports = (model, key) => {
  let notNested = model.schema.paths[key]?.instance;
  if (notNested) return notNested;

  const splittedKeys = key.split('.');
  let path = model.schema.paths[splittedKeys[0]];
  for (let i = 1; i < splittedKeys.length; i++) {
    path = path.schema.paths[splittedKeys[i]];
  }
  return path.instance;
};

// explination : in the api_feature in the filter function
// if the filter field was a string , we want to get all the documents
// that have the value of this field in it .
// so if the filter was : name = Mo
// we want to respond with all the docs which their name props contain the value Mo
// like : Mohammed, Mounis and so on
// in order to decide the type of the field if it is a string or not ,
// we ask the model schema paths
// but what about the nested schema ? this function deals with it .
// fieldone.fieldtwo.fieldthree
