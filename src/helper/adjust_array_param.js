module.exports = arr => {
  if (Array.isArray(arr)) return { $in: arr };
  try {
    arr = decodeURIComponent(arr);
    arr = arr = JSON.parse(arr);
    arr = arr.map(e => e.toLowerCase());
    arr = { $in: arr };
  } catch {
    return [];
  }
  return arr;
};
