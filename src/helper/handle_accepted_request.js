const Company = require('../models/companies_model');
const User = require('../models/users_model');
const validCompany = require('../utils/validation/companies/valid_company');
const $ = require('../locales/keys.js');
const ApiError = require('../utils/api_error.js');
module.exports = async (request, req) => {
  // fetch the company
  let company = await Company.findById(request.company.id);

  // check the validity of the company: exists, not soft deleted and not blocked .
  const error = validCompany(company, { softDeleted: true, blocked: true });
  if (error) return error;

  // fetch the new manager
  const newManager = await User.findById(request.receiver.id);

  // assure that : the user does exists and not soft deleted .
  if (!newManager || newManager.deleted_at) {
    return new ApiError([$.there_is_a_problem_with_this_manager_id, req.body.manager_id], 400, {
      merge: true,
    });
  }

  // assure that : the user is not already a manager .
  const alreadyManager = company.managers.some(
    manager => manager._id.toString() === request.receiver.id.toString(),
  );
  if (alreadyManager) {
    return new ApiError([$.already_manager, request.reciever.id], 400, { merge: true });
  }

  // update the mangers array inside the company .
  company.managers.push({
    _id: newManager._id,
    name: newManager.username,
  });

  // make a realtion between the user and the company (manager_at relationship)
  newManager.manager_at = [
    ...newManager.manager_at,
    {
      company_id: company._id,
      company_name: company.name,
      company_image: company.image?.url,
    },
  ];

  // save the documents .
  await company.save();
  await newManager.save();

  return true;
};
