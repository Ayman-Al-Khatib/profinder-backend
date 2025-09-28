const mongoose = require('mongoose');
function removeDeletedAt(data) {
  if (!data || data.deleted_at) return null;

  if (Array.isArray(data)) return data.map(removeDeletedAt).filter(Boolean);

  if (typeof data === 'object') {
    const result = {};

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date || value instanceof mongoose.Types.ObjectId) {
        result[key] = value;
      } else {
        const cleansedValue = removeDeletedAt(value);
        if (cleansedValue !== null) {
          result[key] = cleansedValue;
        }
      }
    }
    return result;
  }
  return data;
}

module.exports = removeDeletedAt;
