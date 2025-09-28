const _ = require('lodash');
const tr = require('./translate');
const $ = require('../locales/keys');
const { getSingularFromList } = require('./fix_key_model_name');
const ApiError = require('../utils/api_error');
const Profile = require('../models/profile');
const deleteFileOrFiles = require('./delete_files');

exports.createOne =
  ({ Model, fields, targetField, fieldsToOmitFromResponse }) =>
  async (req, res, next) => {
    if (Model === Profile && req.role === 'user') req.params.id = req.user._id;

    const fieldsToCreateNewItem = _.pick(req.body, fields);
    const newDoc = await Model.findByIdAndUpdate(
      req.params.id,
      { $push: { [targetField]: fieldsToCreateNewItem } },
      { new: true, runValidators: true },
    ).populate({ path: 'social_media_links.platform_id' });

    if (!newDoc) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }
    for (let i = 0; (req.saveImages || []).length > i; i++) await req.saveImages[i]();

    const sanitizedDoc = _.omit(newDoc.toObject(), fieldsToOmitFromResponse);

    res.status(201).json({
      status: 'success',
      message: `${tr($.created_successfully)}`,
      [getSingularFromList(Model.modelName)]: sanitizedDoc,
    });
  };

exports.removeOne =
  ({ Model, targetField }) =>
  async (req, res, next) => {
    if (Model === Profile && req.role === 'user') req.params.id = req.user._id;

    const { id, itemId } = req.params;

    const document = await Model.findById(id);

    if (!document) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }

    if (document[targetField]) {
      const itemToUpdate = document[targetField].find(element => element._id.equals(itemId));

      if (itemToUpdate) {
        for (let key in itemToUpdate)
          if (/image|pdf|file/.test(key)) deleteFileOrFiles(itemToUpdate[key]);

        document[targetField] = document[targetField].filter(
          element => !element._id.equals(itemId),
        );

        await document.save();
        return res.status(204).send();
      }
    }

    return next(new ApiError($.item_not_found, 404));
  };

exports.updateOne =
  ({ Model, fields, targetField, fieldsToOmitFromResponse }) =>
  async (req, res, next) => {
    if (Model === Profile && req.role === 'user') req.params.id = req.user.id;

    const { id, itemId } = req.params;

    let document = await Model.findById(id);

    if (!document) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }

    if (!document[targetField]) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(targetField), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }

    const documentToUpdate = document[targetField].find(element => element._id.equals(itemId));

    if (!documentToUpdate) {
      return next(
        new ApiError([$.no_found, targetField, $.for_this_id, itemId], 404, {
          merge: true,
        }),
      );
    }

    const oldDoc = documentToUpdate.toObject();

    const fieldsToUpdate = _.pick(req.body, fields);

    for (let key in oldDoc) {
      if (req.removeImages && req.removeImages.includes(key) && oldDoc[key]) {
        deleteFileOrFiles(oldDoc[key]);
      } else if (req.pushImages && req.pushImages.some(obj => key in obj) && oldDoc[key] != null) {
        deleteFileOrFiles(oldDoc[key]);
      }
    }

    Object.assign(documentToUpdate, fieldsToUpdate);
    await document.save();
    for (let i = 0; (req.saveImages || []).length > i; i++) await req.saveImages[i]();
    document = await Model.findById(id).populate({ path: 'social_media_links.platform_id' });

    const sanitizedProfile = _.omit(document.toObject(), fieldsToOmitFromResponse);

    res.status(200).json({
      status: 'success',
      message: tr($.updated_successfully),
      [getSingularFromList(Model.modelName)]: sanitizedProfile,
    });
  };

exports.removeMany =
  ({ Model, targetField }) =>
  async (req, res, next) => {
    if (Model === Profile && req.role === 'user') req.params.id = req.user._id;

    const { id } = req.params;
    const { ids } = req.body;

    const document = await Model.findById(id);

    if (!document) {
      return next(
        new ApiError(
          [$.no_found, getSingularFromList(Model.modelName), $.for_this_id, req.params.id],
          404,
          {
            merge: true,
          },
        ),
      );
    }

    if (!document[targetField] || !Array.isArray(document[targetField])) {
      return next(new ApiError('No items to delete', 404));
    }

    if (Array.isArray(ids) && ids.length) {
      const idsNotFound = ids.filter(
        id => !document[targetField].some(element => element._id.toString() === id),
      );

      if (idsNotFound.length > 0) {
        return next(
          new ApiError('Some identifiers were not found', 404, { data: { idsNotFound } }),
        );
      }

      document[targetField].forEach(element => {
        if (ids.includes(element._id.toString())) {
          for (let key in element) if (/image|pdf|file/.test(key)) deleteFileOrFiles(element[key]);
          element = undefined;
        }
      });
    } else {
      const someNotDeleted = (document[targetField] || []).length;

      if (someNotDeleted === 0) {
        return next(new ApiError('No items to delete', 404));
      }
      document[targetField].forEach(element => {
        for (let key in element)
          if (/image|pdf|file/.test(key) && element[key]) deleteFileOrFiles(element[key]);
      });
    }
    document[targetField] = undefined;
    await document.save();

    res.status(204).send();
  };
