const User = require('../models/users_model');

module.exports = async company => {
  const founder = await User.findById(company.founder._id);
  company.founder.profile_image_url = founder?.profile_image || null;

  company.managers = await Promise.all(
    company.managers.map(async manager => {
      const user = await User.findById(manager._id);
      return { ...manager, profile_image_url: user?.profile_image || null };
    }),
  );

  return company;
};
