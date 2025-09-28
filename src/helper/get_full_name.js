const Profile = require('../models/profile');
module.exports = async req => {
  const doc = await Profile.findById(req.user._id).select('full_name');
  const { full_name } = doc;
  return full_name || req.user.username;
};
