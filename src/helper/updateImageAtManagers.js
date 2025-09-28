const User = require('../models/users_model');

module.exports = async company => {
  const imageUrl = company.image?.url || null;

  const managerIds = company.managers.map(m => m._id);

  await User.updateMany(
    { _id: { $in: managerIds }, 'manager_at.company_id': company._id },
    { $set: { 'manager_at.$.company_image': imageUrl } },
  );

  await User.findOneAndUpdate(
    { _id: company.founder._id, 'companies.company_id': company._id },
    { $set: { 'companies.$.company_image': imageUrl } },
  );

  return;
};
