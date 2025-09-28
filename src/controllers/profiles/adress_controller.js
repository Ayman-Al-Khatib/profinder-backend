const Profile = require('../../models/profile');
const recursiveKeyPrefixTransform = require('../../helper/recursive_key_prefix_transform');

const _ = require('lodash');
const tr = require('../../helper/translate');
const $ = require('../../locales/keys');

/**
 * @desc    Update address details for the authenticated user's profile
 * @route   PUT /api/users/profiles/address
 * @access  Private (authenticated user)
 */
exports.update = async (req, res) => {
  req.params.id = req.user.id;

  // Transform and pick specific fields from the request body
  req.body = recursiveKeyPrefixTransform(
    _.pick(req.body, ['country', 'conservative', 'city', 'street']) || {},
    'address',
  );

  const fields = Object.keys(req.body);
  const fieldsToUpdate = _.pick(req.body, fields);

  const setFields = _.pickBy(fieldsToUpdate, value => value !== undefined);
  const unsetFields = _.pickBy(fieldsToUpdate, value => value == undefined);

  const update = {};
  if (!_.isEmpty(setFields)) {
    update.$set = setFields;
  }
  if (!_.isEmpty(unsetFields)) {
    update.$unset = _.mapValues(unsetFields, () => '');
  }

  const updatedDocument = await Profile.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  })
    .populate({ path: 'social_media_links.platform_id' })
    .select('-__v');

  return res.status(200).json({
    status: 'success',
    message: tr($.updated_successfully),
    profile: updatedDocument,
  });
};
